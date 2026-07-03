import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

const Landing = () => {
  return (
    <>
      <SEO title="Home" description="Welcome to the store." />
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-6">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Welcome</h1>
        <p className="text-slate-500 max-w-md mb-8">
          This is a placeholder landing page. Replace it with your storefront.
        </p>
        <Link
          to="/login"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
        >
          Sign in
        </Link>
      </div>
    </>
  );
};

export default Landing;
