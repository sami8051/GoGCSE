import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, deleteUser } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCEEQBoSXPKiG0mEX_H6bA1aSn072FD_DA",
    authDomain: "gcse-a7ffe.firebaseapp.com",
    projectId: "gcse-a7ffe",
    storageBucket: "gcse-a7ffe.firebasestorage.app",
    messagingSenderId: "266952172762",
    appId: "1:266952172762:web:9ef234cf67a8ab32afb1e3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const userEmail = 'saman.nemati.uk@gmail.com';

async function deleteUserData() {
    console.log(`🔍 Searching for user: ${userEmail}`);

    // Find user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', userEmail));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log('❌ User not found');
        process.exit(1);
    }

    let userId = null;
    snapshot.forEach(doc => {
        userId = doc.id;
        console.log('✅ Found user:', doc.id);
        console.log('📄 User data:', JSON.stringify(doc.data(), null, 2));
    });

    if (!userId) {
        console.log('❌ No user ID found');
        process.exit(1);
    }

    console.log(`\n🗑️  Deleting all data for user: ${userId}\n`);

    // Delete from collections
    const collections = [
        'examResults',
        'labSessions',
        'assignment_results',
        'loginEvents'
    ];

    for (const collectionName of collections) {
        const colRef = collection(db, collectionName);
        const userQuery = query(colRef, where('userId', '==', userId));
        const docs = await getDocs(userQuery);
        
        console.log(`📦 Found ${docs.size} documents in ${collectionName}`);
        
        for (const docSnapshot of docs.docs) {
            await deleteDoc(doc(db, collectionName, docSnapshot.id));
            console.log(`   ✅ Deleted ${collectionName}/${docSnapshot.id}`);
        }
    }

    // Delete user consents
    try {
        const consentsRef = collection(db, 'userConsents', userId, 'events');
        const consentDocs = await getDocs(consentsRef);
        console.log(`📦 Found ${consentDocs.size} consent events`);
        
        for (const consentDoc of consentDocs.docs) {
            await deleteDoc(doc(db, 'userConsents', userId, 'events', consentDoc.id));
            console.log(`   ✅ Deleted consent event ${consentDoc.id}`);
        }

        // Delete parent consent document
        await deleteDoc(doc(db, 'userConsents', userId));
        console.log(`   ✅ Deleted userConsents/${userId}`);
    } catch (error) {
        console.log(`   ⚠️  No consents found or error: ${error.message}`);
    }

    // Delete user profile
    await deleteDoc(doc(db, 'users', userId));
    console.log(`✅ Deleted user profile: users/${userId}`);

    console.log(`\n✅ All data deleted for ${userEmail}`);
    console.log(`\n⚠️  NOTE: To delete the Firebase Authentication account, go to:`);
    console.log(`   https://console.firebase.google.com/project/gcse-a7ffe/authentication/users`);
    console.log(`   and manually delete the user.`);
    
    process.exit(0);
}

deleteUserData().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
