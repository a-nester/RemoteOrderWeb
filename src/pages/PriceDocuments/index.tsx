import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PriceDocumentsService } from '../../services/priceDocuments.service';
import type { PriceDocument } from '../../types/priceDocument';

export default function PriceDocumentList() {
    const [documents, setDocuments] = useState<PriceDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        try {
            const data = await PriceDocumentsService.fetchDocuments();
            setDocuments(data);
        } catch (error) {
            console.error('Failed to load documents', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Price Settings</h1>
                <button
                    onClick={() => navigate('/price-documents/new')}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Document
                </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Price Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                        ) : documents.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No documents found</td></tr>
                        ) : (
                            documents.map((doc) => (
                                <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/price-documents/${doc.id}`)}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(doc.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {doc.targetPriceTypeName || doc.targetPriceTypeId}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            doc.status === 'APPLIED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {doc.comment || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/price-documents/${doc.id}`);
                                            }}
                                        >
                                            View
                                        </button>
                                        <button 
                                            className="text-gray-600 hover:text-gray-900"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!confirm('Are you sure you want to copy this document?')) return;
                                                try {
                                                    const newDoc = await PriceDocumentsService.copyDocument(doc.id);
                                                    navigate(`/price-documents/${newDoc.id}`);
                                                } catch (error) {
                                                    console.error('Failed to copy document', error);
                                                    alert('Failed to copy document');
                                                }
                                            }}
                                        >
                                            Copy
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
