import React, { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';
import { storage } from '../../services/firebase';
import { useOutletContext } from 'react-router-dom';
import { Image, Search, Trash2, Download, ExternalLink, Folder, RefreshCw, AlertCircle } from 'lucide-react';

interface AssetItem {
    name: string;
    fullPath: string;
    url: string;
    size?: number;
    contentType?: string;
    timeCreated?: string;
}

const AdminAssets: React.FC = () => {
    const context = useOutletContext<{ darkMode: boolean }>();
    const darkMode = context?.darkMode || false;

    const [assets, setAssets] = useState<AssetItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const cardClass = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    const textClass = darkMode ? 'text-white' : 'text-slate-900';
    const textMutedClass = darkMode ? 'text-slate-400' : 'text-slate-500';

    useEffect(() => {
        loadAssets();
    }, []);

    const loadAssets = async () => {
        setLoading(true);
        try {
            const folders = ['exam-images', 'pdfs', 'uploads'];
            const allAssets: AssetItem[] = [];

            for (const folder of folders) {
                try {
                    const folderRef = ref(storage, folder);
                    const result = await listAll(folderRef);

                    for (const item of result.items) {
                        try {
                            const url = await getDownloadURL(item);
                            const metadata = await getMetadata(item);
                            allAssets.push({
                                name: item.name,
                                fullPath: item.fullPath,
                                url,
                                size: metadata.size,
                                contentType: metadata.contentType,
                                timeCreated: metadata.timeCreated
                            });
                        } catch (e) {
                            // Skip items that can't be accessed
                        }
                    }
                } catch (e) {
                    // Folder doesn't exist, skip
                }
            }

            setAssets(allAssets.sort((a, b) =>
                new Date(b.timeCreated || 0).getTime() - new Date(a.timeCreated || 0).getTime()
            ));
        } catch (e) {
            console.error('Failed to load assets', e);
        }
        setLoading(false);
    };

    const handleDelete = async (asset: AssetItem) => {
        if (!window.confirm(`Delete "${asset.name}"? This cannot be undone.`)) return;

        setDeleting(asset.fullPath);
        try {
            const assetRef = ref(storage, asset.fullPath);
            await deleteObject(assetRef);
            setAssets(prev => prev.filter(a => a.fullPath !== asset.fullPath));
            if (selectedAsset?.fullPath === asset.fullPath) setSelectedAsset(null);
        } catch (e) {
            console.error('Failed to delete asset', e);
            alert('Failed to delete asset');
        }
        setDeleting(null);
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return 'Unknown';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const filteredAssets = assets.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isImage = (contentType?: string) => contentType?.startsWith('image/');
    const isPdf = (contentType?: string) => contentType === 'application/pdf';

    if (loading) return <div className={`p-8 text-center ${textMutedClass}`}>Loading assets...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className={`text-2xl font-bold ${textClass}`}>Asset Management</h1>
                    <p className={textMutedClass}>View and manage uploaded files and generated images.</p>
                </div>
                <button
                    onClick={loadAssets}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                >
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </div>

            {/* Search */}
            <div className={`flex items-center gap-4 flex-wrap p-4 rounded-xl border ${cardClass}`}>
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} />
                    <input
                        type="text"
                        placeholder="Search by filename..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200'
                            }`}
                    />
                </div>
                <span className={`text-sm ${textMutedClass}`}>
                    {filteredAssets.length} files • {formatSize(filteredAssets.reduce((acc, a) => acc + (a.size || 0), 0))} total
                </span>
            </div>

            {/* Assets Grid */}
            {filteredAssets.length === 0 ? (
                <div className={`text-center py-12 ${cardClass} rounded-xl border`}>
                    <Folder size={48} className={`mx-auto mb-4 ${textMutedClass}`} />
                    <p className={textMutedClass}>No assets found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredAssets.map((asset) => (
                        <div
                            key={asset.fullPath}
                            className={`rounded-xl border overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] ${cardClass} ${selectedAsset?.fullPath === asset.fullPath ? 'ring-2 ring-indigo-500' : ''
                                }`}
                            onClick={() => setSelectedAsset(asset)}
                        >
                            <div className="aspect-square bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                {isImage(asset.contentType) ? (
                                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                                ) : isPdf(asset.contentType) ? (
                                    <div className="text-red-500">
                                        <Folder size={48} />
                                        <p className="text-xs mt-2">PDF</p>
                                    </div>
                                ) : (
                                    <Folder size={48} className={textMutedClass} />
                                )}
                            </div>
                            <div className="p-3">
                                <p className={`text-sm font-medium truncate ${textClass}`}>{asset.name}</p>
                                <p className={`text-xs ${textMutedClass}`}>{formatSize(asset.size)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Asset Detail Modal */}
            {selectedAsset && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAsset(null)}>
                    <div
                        className={`rounded-2xl shadow-2xl max-w-2xl w-full ${darkMode ? 'bg-slate-800' : 'bg-white'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="aspect-video bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden rounded-t-2xl">
                            {isImage(selectedAsset.contentType) ? (
                                <img src={selectedAsset.url} alt={selectedAsset.name} className="max-w-full max-h-full object-contain" />
                            ) : (
                                <Folder size={64} className={textMutedClass} />
                            )}
                        </div>
                        <div className="p-5">
                            <h3 className={`text-lg font-bold ${textClass} mb-3`}>{selectedAsset.name}</h3>
                            <div className={`grid grid-cols-2 gap-4 text-sm ${textMutedClass} mb-4`}>
                                <div>
                                    <span className="font-medium">Size:</span> {formatSize(selectedAsset.size)}
                                </div>
                                <div>
                                    <span className="font-medium">Type:</span> {selectedAsset.contentType || 'Unknown'}
                                </div>
                                <div>
                                    <span className="font-medium">Path:</span> {selectedAsset.fullPath}
                                </div>
                                <div>
                                    <span className="font-medium">Created:</span> {selectedAsset.timeCreated
                                        ? new Date(selectedAsset.timeCreated).toLocaleDateString()
                                        : 'Unknown'}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <a
                                    href={selectedAsset.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
                                >
                                    <ExternalLink size={18} />
                                    Open
                                </a>
                                <a
                                    href={selectedAsset.url}
                                    download={selectedAsset.name}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        }`}
                                >
                                    <Download size={18} />
                                    Download
                                </a>
                                <button
                                    onClick={() => handleDelete(selectedAsset)}
                                    disabled={deleting === selectedAsset.fullPath}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:opacity-50"
                                >
                                    <Trash2 size={18} />
                                    {deleting === selectedAsset.fullPath ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAssets;
