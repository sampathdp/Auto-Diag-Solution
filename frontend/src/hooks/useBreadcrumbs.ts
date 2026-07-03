import { useLocation } from "react-router-dom";
import { privateRoutes } from "@/app/router/routes";

export const useBreadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  const breadcrumbs = pathnames.map((_, index) => {
    const url = `/${pathnames.slice(0, index + 1).join("/")}`;
    const route = privateRoutes.find((r) => r.path === url);
    
    return {
      label: route ? route.label : pathnames[index],
      url,
    };
  });

  return breadcrumbs;
};
