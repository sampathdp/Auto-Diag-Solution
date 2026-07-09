import { getTranslations } from "next-intl/server";

const BRANDS = ["BOSCH", "NGK", "DENSO", "TOYOTA", "NISSAN", "FORD", "BREMBO", "KYB", "MANN", "MOBIL 1"];

export async function BrandsStrip() {
  const t = await getTranslations("home.brands");

  return (
    <section className="bg-foreground py-14 md:py-28">
      <div className="mx-auto max-w-wrap px-6 md:px-14">
        <div className="mb-10">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <span className="block h-0.5 w-6 bg-primary" />
            {t("eyebrow")}
          </div>
          <h2 className="mt-4 max-w-[720px] text-[26px] font-extrabold tracking-tight text-balance text-background sm:text-[36px]">
            {t("title")}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-5">
          {BRANDS.map((b) => (
            <div
              key={b}
              className="flex min-h-[96px] items-center justify-center bg-foreground px-4 text-center text-[17px] font-black tracking-tight text-white/40 transition-colors hover:text-white"
            >
              {b}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
