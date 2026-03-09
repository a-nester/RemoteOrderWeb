import Layout from "../components/Layout";
import CollectionPlanner from "./Admin/CollectionPlanner/CollectionPlanner";

export default function Dashboard() {
  return (
    <Layout title="Dashboard">
      <div className="h-[calc(100vh-8rem)]">
        <CollectionPlanner />
      </div>
    </Layout>
  );
}
