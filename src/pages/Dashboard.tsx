import Layout from "../components/Layout";

export default function Dashboard() {
    return (
        <Layout title="Overview">
             <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
                <p className="text-gray-500 text-xl">
                    Welcome to the dashboard!
                </p>
             </div>
        </Layout>
    );
}
