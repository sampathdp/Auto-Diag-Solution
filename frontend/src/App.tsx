import { useState, useEffect } from "react";
import { AppRouter } from "./app/router/AppRouter";
import Preloader from "./components/ui/Preloader";

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <Preloader />;
  }

  return <AppRouter />;
}

export default App;
