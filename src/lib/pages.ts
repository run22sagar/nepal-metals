import { countries } from "./domain";
import { copy, type Locale } from "./i18n";
export const routes = [
  "",
  "gold-price-in-nepal",
  "silver-price-in-nepal",
  "gold-price-history",
  "silver-price-history",
  "compare",
  "news",
  "methodology",
  "privacy",
  ...countries
    .filter((c) => c.code !== "NP")
    .map((c) => `gold-price/${c.slug}`),
];
export function pageInfo(path: string, locale: Locale) {
  const t = copy[locale];
  const country = countries.find((c) => path === `gold-price/${c.slug}`);
  const titles: Record<string, string> = {
    "": t.hero,
    "gold-price-in-nepal": t.hero,
    "silver-price-in-nepal":
      locale === "en"
        ? "Silver price in Nepal today"
        : "नेपालमा आजको चाँदीको भाउ",
    "gold-price-history": t.goldHistory,
    "silver-price-history": t.silverHistory,
    compare:
      locale === "en"
        ? "Gold & silver, across borders"
        : "देशअनुसार सुन र चाँदीको तुलना",
    news:
      locale === "en"
        ? "Precious metals & market news"
        : "बहुमूल्य धातु र बजार समाचार",
    methodology: t.methodology,
    privacy: t.privacy,
  };
  const descriptions: Record<string, string> = {
    "": t.intro,
    "gold-price-in-nepal":
      locale === "en"
        ? "Verified fine gold reference prices in Nepal, in NPR per tola and per 10 grams. Compare publications, understand changes, and estimate your gold’s value."
        : "नेपालमा प्रमाणित सुनको सन्दर्भ मूल्य, प्रति तोला र प्रति १० ग्राम। मूल्यको परिवर्तन र अनुमानित मूल्य हेर्नुहोस्।",
    "silver-price-in-nepal":
      locale === "en"
        ? "Follow Nepal’s published silver reference rate, its latest change, and verified price history. Convert between tola, grams and troy ounces."
        : "नेपालको प्रकाशित चाँदीको सन्दर्भ मूल्य, पछिल्लो परिवर्तन र प्रमाणित इतिहास हेर्नुहोस्।",
    "gold-price-history":
      locale === "en"
        ? "Explore verified Nepal gold publications by date. Compare 7 days, 30 days, 90 days and a year, with original source links and no invented history."
        : "मितिअनुसार प्रमाणित सुनको मूल्य र मूल स्रोत लिङ्क हेर्नुहोस्।",
    "silver-price-history":
      locale === "en"
        ? "Trace Nepal silver reference prices over time. Filter original publications and inspect exact prices per tola and per 10 grams."
        : "नेपालको चाँदीको सन्दर्भ मूल्यको इतिहास हेर्नुहोस्।",
    compare: t.worldIntro,
    news: t.newsIntro,
    methodology:
      locale === "en"
        ? "How Nepal Metals verifies daily reference rates, distinguishes spot estimates and handles missing or stale data."
        : "नेपाल मेटल्समा दैनिक सन्दर्भ मूल्यको प्रमाणीकरण र स्पट अनुमानको विधि।",
    privacy:
      locale === "en"
        ? "How we handle notification subscriptions, device preferences and privacy."
        : "सूचना सदस्यता, उपकरणका प्राथमिकता र गोपनीयता।",
  };
  return {
    title: country
      ? locale === "en"
        ? `Gold price in ${country.name}`
        : `${country.name} मा सुनको मूल्य`
      : titles[path],
    description: country
      ? locale === "en"
        ? `International fine gold spot estimates in ${country.currency}, with weight conversion and a Nepal reference comparison. These are indicative values, not local retail quotations.`
        : `${country.currency} मा अन्तर्राष्ट्रिय सुनको स्पट अनुमान। यी स्थानीय खुद्रा मूल्य होइनन्।`
      : descriptions[path],
    country,
  };
}
export const faqs = {
  en: [
    [
      "Is Nepal’s gold price a live trading price?",
      "No. Nepal’s reference rate follows the source’s daily publication schedule. International spot prices trade separately. We show the actual publication date and never label a previous day’s rate as today’s.",
    ],
    [
      "How many grams are in one tola?",
      "We use 11.6638038 grams per tola and 31.1034768 grams per troy ounce. Converted values are rounded only for display.",
    ],
    [
      "Will a jewellery shop charge this exact amount?",
      "The displayed value is a reference for the metal. Purity, making charges, taxes and shop margins can affect the final jewellery price. Confirm the complete quote with the seller.",
    ],
    [
      "When will I receive my daily alert?",
      "With your permission, daily alerts are checked from 9:00 AM Nepal time. An alert waits until all your selected metals have verified rates for the current Nepal date. Some days may have no alert.",
    ],
  ],
  ne: [
    [
      "के नेपालको सुनको मूल्य प्रत्यक्ष कारोबार मूल्य हो?",
      "होइन। नेपालको सन्दर्भ मूल्य स्रोतको दैनिक प्रकाशनअनुसार आउँछ। अन्तर्राष्ट्रिय स्पट मूल्य अलग हुन्छ। अघिल्लो दिनको मूल्यलाई आजको भनिँदैन।",
    ],
    [
      "एक तोलामा कति ग्राम हुन्छ?",
      "हामी १ तोला बराबर ११.६६३८०३८ ग्राम र १ ट्रोय औंस बराबर ३१.१०३४७६८ ग्राम प्रयोग गर्छौँ।",
    ],
    [
      "के गहना पसलमा यही मूल्य तिर्नुपर्छ?",
      "यो धातुको सन्दर्भ मूल्य हो। शुद्धता, ज्याला, कर र पसलको नाफाले अन्तिम मूल्य फरक हुन सक्छ।",
    ],
    [
      "दैनिक सूचना कहिले आउँछ?",
      "तपाईंको अनुमतिमा बिहान ९ बजेपछि जाँच गरिन्छ। छानिएका सबै धातुको आजको प्रमाणित मूल्य आएपछि सूचना पठाइन्छ। केही दिन सूचना नआउन सक्छ।",
    ],
  ],
};
