import { useQueryState, parseAsString, parseAsInteger, parseAsBoolean, parseAsArrayOf } from "nuqs";
import { ProductFilters } from "@/mocks/storefront/data";

export function useShopFilters() {
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const [category, setCategory] = useQueryState("category", parseAsString);
  const [brand, setBrand] = useQueryState("brand", parseAsArrayOf(parseAsString));
  const [minPrice, setMinPrice] = useQueryState("min_price", parseAsInteger);
  const [maxPrice, setMaxPrice] = useQueryState("max_price", parseAsInteger);
  const [inStock, setInStock] = useQueryState("in_stock", parseAsBoolean.withDefault(false));
  const [fitsYear, setFitsYear] = useQueryState("fits_year", parseAsString);
  const [fitsMake, setFitsMake] = useQueryState("fits_make", parseAsString);
  const [fitsModel, setFitsModel] = useQueryState("fits_model", parseAsString);
  const [rating, setRating] = useQueryState("rating", parseAsInteger);
  const [sort, setSort] = useQueryState("sort", parseAsString);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  // Build the filter object to pass to API
  const filters: ProductFilters = {
    q: q || undefined,
    category: category || undefined,
    brand: brand || undefined,
    min_price: minPrice || undefined,
    max_price: maxPrice || undefined,
    in_stock: inStock ? true : undefined,
    fits_year: fitsYear || undefined,
    fits_make: fitsMake || undefined,
    fits_model: fitsModel || undefined,
    rating: rating || undefined,
    sort: (sort as any) || undefined,
    page,
  };

  const clearFilters = () => {
    setQ(null);
    setCategory(null);
    setBrand(null);
    setMinPrice(null);
    setMaxPrice(null);
    setInStock(null);
    setFitsYear(null);
    setFitsMake(null);
    setFitsModel(null);
    setRating(null);
    setSort(null);
    setPage(1);
  };

  return {
    filters,
    clearFilters,
    q, setQ,
    category, setCategory,
    brand, setBrand,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    inStock, setInStock,
    fitsYear, setFitsYear,
    fitsMake, setFitsMake,
    fitsModel, setFitsModel,
    rating, setRating,
    sort, setSort,
    page, setPage,
  };
}
