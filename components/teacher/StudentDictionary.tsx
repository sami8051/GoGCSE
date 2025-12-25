import React, { useEffect, useState } from 'react';
import { auth, db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Search, Users, BookOpen } from 'lucide-react';
import { Classroom } from '../../types';

interface Student {
    uid: string;
    displayName: string;
    joinedAt: number;
    classId: string;
    className: string;
}

const StudentDictionary: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [classes, setClasses] = useState<Classroom[]>([]);

    useEffect(() => {
        if (auth.currentUser) {
            loadTeacherData();
        }
    }, []);

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        let filtered = students.filter(s =>
            (s.displayName || '').toLowerCase().includes(lower) ||
            (s.uid || '').includes(lower)
        );

        if (selectedClass !== 'all') {
            filtered = filtered.filter(s => s.classId === selectedClass);
        }

        setFilteredStudents(filtered);
    }, [searchTerm, students, selectedClass]);

    const loadTeacherData = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            // 1. Get all classes for this teacher
            const classQuery = query(collection(db, 'classes'), where('teacherId', '==', auth.currentUser.uid));
            const classSnapshot = await getDocs(classQuery);
            const teacherClasses = classSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Classroom));
            setClasses(teacherClasses);

            // 2. Get all students from all classes
            const allStudents: Student[] = [];
            for (const classroom of teacherClasses) {
                try {
                    const membersRef = collection(db, 'classes', classroom.id, 'members');
                    const membersSnap = await getDocs(membersRef);
                    membersSnap.docs.forEach(doc => {
                        const data = doc.data();
                        allStudents.push({
                            uid: data.uid || doc.id,
                            displayName: data.displayName || 'Unnamed Student',
                            joinedAt: data.joinedAt || Date.now(),
                            classId: classroom.id,
                            className: classroom.name
                        });
                    });
                } catch (error) {
                    console.error(`Error loading members for class ${classroom.id}:`, error);
                }
            }

            // Remove duplicates (in case a student is in multiple classes)
            const uniqueStudents = Array.from(new Map(
                allStudents.map(s => [`${s.uid}-${s.classId}`, s])
            ).values());

            setStudents(uniqueStudents);
            setFilteredStudents(uniqueStudents);
        } catch (error) {
            console.error("Error loading teacher data:", error);
        }
        setLoading(false);
    };

    if (loading) return <div className="p-8">Loading student directory...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Student Directory</h1>
                    <p className="text-slate-500">View all students enrolled in your classes.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-edexcel-teal w-64"
                    />
                </div>
            </div>

            {/* Filter by Class */}
            {classes.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setSelectedClass('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            selectedClass === 'all'
                                ? 'bg-edexcel-teal text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        All Classes ({students.length})
                    </button>
                    {classes.map(cls => {
                        const classStudentCount = students.filter(s => s.classId === cls.id).length;
                        return (
                            <button
                                key={cls.id}
                                onClick={() => setSelectedClass(cls.id)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    selectedClass === cls.id
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                {cls.name} ({classStudentCount})
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Students Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">Student Name</th>
                            <th className="px-6 py-4">Class</th>
                            <th className="px-6 py-4">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                    {classes.length === 0 ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Users size={32} className="text-slate-300" />
                                            <p>No classes created yet. Create a class to enroll students.</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Users size={32} className="text-slate-300" />
                                            <p>No students found matching your search.</p>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map((student) => (
                                <tr key={`${student.uid}-${student.classId}`} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                {student.displayName?.charAt(0) || 'S'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{student.displayName}</div>
                                                <div className="text-xs text-slate-400 font-mono" title={student.uid}>
                                                    {student.uid.slice(0, 12)}...
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <BookOpen size={16} className="text-slate-400" />
                                            {student.className}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {student.joinedAt ? new Date(student.joinedAt).toLocaleDateString() : 'Unknown'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentDictionary;
