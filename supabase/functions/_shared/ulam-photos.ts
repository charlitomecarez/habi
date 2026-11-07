// Photos of common dishes, from Wikimedia Commons. A person checked each one, because a blind search
// can show the wrong thing. A dish with no photo here gets one Commons search, or keeps its drawing.

const CHECKED: Record<string, string> = {
  "bicol express":
    "https://upload.wikimedia.org/wikipedia/commons/e/e8/Bicol_Express.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
  "chicken adobo":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Chicken_adobo.jpg/960px-Chicken_adobo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "chicken afritada":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Chicken_Afritada%2C_Mar_2024.jpg/960px-Chicken_Afritada%2C_Mar_2024.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "corned beef guisado":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/Carne_norte_guisado_%28Corned_beef_guisado%29_-_Philippines_02.jpg/960px-Carne_norte_guisado_%28Corned_beef_guisado%29_-_Philippines_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "daing na bangus":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Daing_na_bangus.jpg/960px-Daing_na_bangus.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "ginataang kalabasa":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Ginataang_kalabasa_%28Philippines%29.jpg/960px-Ginataang_kalabasa_%28Philippines%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "ginisang ampalaya":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Ang_Ginisang_Ampalaya_01.jpg/960px-Ang_Ginisang_Ampalaya_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "ginisang monggo":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c4/Ginisang_munggo_with_fried_bangus.jpg/960px-Ginisang_munggo_with_fried_bangus.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "ginisang pechay":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Ginisang_petsay_with_tuna_and_egg.jpg/960px-Ginisang_petsay_with_tuna_and_egg.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "ginisang repolyo":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Ginisang_tokwa_at_repolyo_04.jpg/960px-Ginisang_tokwa_at_repolyo_04.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "ginisang sayote":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Ginisang_sayote_at_carrots.jpg/960px-Ginisang_sayote_at_carrots.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  kaldereta:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Beef_caldereta.jpg/960px-Beef_caldereta.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "kare-kare":
    "https://upload.wikimedia.org/wikipedia/commons/5/5a/Kare-kare.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
  "lumpiang shanghai":
    "https://upload.wikimedia.org/wikipedia/commons/9/95/Lumpiang_Shanghai_%28Philippines%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
  menudo:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Menudo_%28Philippines%29_02.jpg/960px-Menudo_%28Philippines%29_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "nilagang baka":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/Nilagang_Baka.jpg/960px-Nilagang_Baka.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "paksiw na tilapia":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/9840Paksiw_na_Tilapia_Tagalog_11.jpg/960px-9840Paksiw_na_Tilapia_Tagalog_11.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "pancit canton":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Pancit_canton.jpg/960px-Pancit_canton.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  pinakbet:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/Pinakbet.jpg/960px-Pinakbet.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "pork adobo":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Pork_Adobo_with_Sinangag.jpg/960px-Pork_Adobo_with_Sinangag.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "pritong galunggong":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/4013Pritong_Galunggong_Babae_15.jpg/960px-4013Pritong_Galunggong_Babae_15.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "sinigang na baboy":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Sinigang_na_Baboy.jpg/960px-Sinigang_na_Baboy.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "sinigang na bangus":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Sinigang_na_Bangus_01.jpg/960px-Sinigang_na_Bangus_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  sisig:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Sisig_%28Philippines%29_02.jpg/960px-Sisig_%28Philippines%29_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  tinola:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Tinola_na_Manok.jpg/960px-Tinola_na_Manok.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "tinolang manok":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Tinola_na_Manok.jpg/960px-Tinola_na_Manok.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  "tortang talong":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/Tortang_Talong_2019.jpg/960px-Tortang_Talong_2019.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
};

/** The checked photo for a dish. The longest name wins, so "Chicken adobo sa gata" finds "chicken adobo". */
export function checkedPhoto(name: string): string | undefined {
  const dish = name.trim().toLowerCase();
  if (CHECKED[dish]) return CHECKED[dish];
  const match = Object.keys(CHECKED)
    .filter((key) => dish.includes(key))
    .sort((a, b) => b.length - a.length)[0];
  return match ? CHECKED[match] : undefined;
}

export function commonsSearchUrl(name: string): string {
  const query = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `${name} Philippines filetype:bitmap`,
    gsrlimit: "1",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "800",
  });
  return `https://commons.wikimedia.org/w/api.php?${query}`;
}

/** The first https photo in a Commons reply. Anything else means no photo. */
export function commonsPhoto(reply: unknown): string | undefined {
  const pages = (reply as { query?: { pages?: Record<string, { imageinfo?: { thumburl?: string }[] }> } })?.query
    ?.pages;
  const url = Object.values(pages ?? {})[0]?.imageinfo?.[0]?.thumburl;
  return url?.startsWith("https://") ? url : undefined;
}
