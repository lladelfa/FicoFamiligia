import React, { createContext, useContext, useState, useEffect } from "react";
import { parseGedcom, exportToGedcom } from "../utils/gedcomProcessor";
import type { Individual, Family, ArchiveDocument } from "../utils/gedcomProcessor";

interface FamilyContextType {
  individuals: Record<string, Individual>;
  families: Record<string, Family>;
  documents: ArchiveDocument[];
  activeView: "tree" | "stories" | "archive";
  selectedNodeId: string | null;
  geminiApiKey: string;
  setActiveView: (view: "tree" | "stories" | "archive") => void;
  selectNode: (id: string | null) => void;
  updateIndividual: (id: string, updates: Partial<Individual>) => void;
  updateFamily: (id: string, updates: Partial<Family>) => void;
  addIndividual: (individual: Individual) => void;
  addFamily: (family: Family) => void;
  deleteIndividual: (id: string) => void;
  importGedcom: (rawText: string) => void;
  exportGedcom: () => string;
  setGeminiApiKey: (key: string) => void;
  addDocument: (doc: ArchiveDocument) => void;
  deleteDocument: (id: string) => void;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

// Initial documents to pre-populate the Document Archive view
const initialDocuments: ArchiveDocument[] = [
  {
    id: "doc-1",
    title: "Marriage Certificate - 1920",
    date: "June 12, 1920",
    category: "Documents",
    tags: ["ARCHIVAL"],
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuD1M5ls70ARWR6t6wNgUdTlTeOnfNpJZT44G39RautXZnjAjfM6fRcekZVsf7w-D67hxZEhMQwW0iBjuNzpcQYpmxPSsT7T1NnvQlsNiyJzbGGfkkfMcyZXuMJ_fmMagNm_X36_Awl2L0ogZihQDKUdEAy2djTwZjocpD_Hgzjbmog1cp737omVE-Eb73IjeZeBoNaUNmah6GVl2ROgK_HTNn0isD19YETKsB-ljcJ_Pybv17c-9-_NT3Ie09R-alUDJvRXft4ehcHZ",
    description: "A macro close-up of a weathered, yellowed marriage certificate from 1920 with elegant cursive handwriting and a faded wax seal.",
    verified: true,
    contributor: "You (Marco O.)"
  },
  {
    id: "doc-2",
    title: "Maria's Recipe Book",
    date: "Circa 1945",
    category: "Documents",
    tags: ["HERITAGE"],
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAW9iFFAG4hbMU1fOXD2v7ZCP3QLQR6i4xgeblsjjDyLNGmWnuabS7KCknoLvRuKEUZrE_IjDlFCQrbyBlE-cHtFCCaDuUySiT7Ab23iS27DGQEM6BgZ4-FXuj5df4JOWfxBO2SmGVJK8mco1p-KMEG6KvQupPN-ERfZIQgASVnAy23JExMOIeQSd0KRSOaXSrtxRsHv0Pa9SnZGxR9TSzVRVQxjkdz80WdBKYN9RheVaLETGm8DIZ_UN6BKOo1_TL_iuC3XLI2H3QO",
    description: "A vintage handwritten recipe book open to a page titled 'Maria's Pasta Sauce', with splatters of oil and ink on thick cream paper.",
    verified: false,
    contributor: "You (Marco O.)"
  },
  {
    id: "doc-3",
    title: "Sunday Drive at the Lake",
    date: "August 1954",
    category: "Photos",
    tags: ["VISUAL"],
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAzFCmyOQEXYG3wf6wYCxgNCl3b0OBX9aOtU7IiJ8Zx3YxMeR5W4sviBDPwJbli6RMIMYDwvayv0apfMJ6OKLd78UF4U4b5_b_LZ-MnQOD1I2q3I-PuQftstLy96g84WO2PZ0HqEqn1G1rCRRrt7QuYI7rCi-mb8dfi1ZBcfW1SEIIp76dcCMMffkO8zdm_12i5hy5AIWC-S2Ad1ax8slvqCXWAXmZTowIfZbbUyIvyEpnZM7fgZU47JsKE9Ds57SvSErfp9BpdC4l7",
    description: "A scan of a 1950s photo showing a family gathered around a blue sedan near Lake Tahoe, Nevada.",
    verified: false,
    contributor: "You (Marco O.)"
  },
  {
    id: "doc-4",
    title: "War Letters: Thomas L.",
    date: "1914 - 1918",
    category: "Letters",
    tags: ["PRIVATE"],
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCFFgz-N2v8ETcqBhxyyrwA41a_QRo1qhmf7MOMoikWcIoaAJlaXRsF4N0JtKpbvlA2C74hu2NZlpyaCgQRHFLLpgBzykGUIRvDOfY7FtwDpyMOOuc3HTLABsmOTorrJHo0f7z9lhCJCpKmqVeLdDlYp_sTde9nZ1TrFWXGXoOP0A_ct0PtkReXJzCsKtr9Du6WBONMgJfMXR5JBEzQjpQkylBQiV3pt0PT42qXOnStNrrz_5pEtWCFLkAeMATCuFosl7NFipUI4TDL",
    description: "A stack of folded, handwritten letters tied together with twine, sent during the First World War.",
    verified: false,
    contributor: "You (Marco O.)"
  }
];

// Fallback initial individuals and families matching public/sample.ged
const defaultIndividuals: Record<string, Individual> = {
  "@I1@": {
    id: "@I1@",
    firstName: "Vincenzo",
    lastName: "Oliveri",
    gender: "M",
    birthDate: "12 JUN 1892",
    birthPlace: "Valguarnera Caropepe, Sicily, Italy",
    deathDate: "24 NOV 1964",
    deathPlace: "New York, NY, USA",
    biography: "Vincenzo immigrated to New York in 1913, working on the railways before opening a small grocery store.",
    story: "Vincenzo left Sicily in the spring of 1913 with a single suitcase containing two shirts, a loaf of pane duro, and a handful of dried figs.\n\nHe worked long days on the Catskills railroad under blistering heat, writing letters to his beloved Epifania every Sunday without fail.",
    profileUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC7gGOeCrM-KTMv09cx2v8bzJ7nRAhhthTu9zamCOOxGlCDN9qHQkCph4jvTZmnCTFG6izM-AN3Oj2BZP7HOv8FirnhsJq--yaoik018SR_Lxq4jIIFdJubq_UV_9OceOKDzXU_CoY2zyfWtVmxlmNogFExHBo31M2iN058zPx4AHcx8R-qR9crmtZ3NWtS7yqeVz8PukxZbVN-tdcpulxhvQsGbwZFn0aaRkhqokrn3v3OiGooTP0aRZWbNXcpuSnF8n8SA0Encfzm",
    tags: ["PIONEER", "IMMIGRANT"],
    recordings: []
  },
  "@I2@": {
    id: "@I2@",
    firstName: "Epifania",
    lastName: "Camiola",
    gender: "F",
    birthDate: "04 OCT 1895",
    birthPlace: "Valguarnera Caropepe, Sicily, Italy",
    deathDate: "18 APR 1978",
    deathPlace: "New York, NY, USA",
    biography: "Epifania was a skilled seamstress who joined Vincenzo in New York in 1920.",
    story: "Epifania was the pillar of the family. Known for her delicate lace work and her legendary recipes, she made sure that every child and grandchild learned the language, the songs, and the cooking of Sicily.",
    profileUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuD9e3lWk0u",
    tags: ["MATRIARCH", "ARTISAN"],
    recordings: []
  },
  "@I3@": {
    id: "@I3@",
    firstName: "Maria",
    lastName: "Oliveri",
    gender: "F",
    birthDate: "14 MAR 1924",
    birthPlace: "Valguarnera Caropepe, Sicily, Italy",
    deathDate: "09 SEP 2005",
    deathPlace: "San Jose, CA, USA",
    biography: "Maria was a schoolteacher in New York before moving to California.",
    story: "Maria grew up in the bustling streets of Manhattan. She was the first in the family to attend university, graduating with a degree in literature. She taught grammar for 38 years, instilling a deep love of books in generations of students.",
    profileUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA-Yzb5ZYUJow-sjBF0T4oDUVdI1fp1NiM2S2uEjvS5nBUl8bDGc7bOs0hhjMWoPxwiAJlDZMbqtwYFEB_OJGkflefTkCL49P0Sh-zUPsiJ6BTD2Xmt9RkrRsEurDbtrxGVAyKxHPWS6qAvpz8uuABgntQjKazqB4iRMRKvCDKu2N1ojl8pbKKk-Y-8E_Ucs0lFwhtKEG4ZDpj_V4JKtR_eUaTgq8J7giX9ZlirXPKfjvEQw5sf6H304KxqB3X3g5ecnpLqEsuviwE-",
    tags: ["LEGACY", "TEACHER"],
    recordings: []
  },
  "@I4@": {
    id: "@I4@",
    firstName: "Placido",
    lastName: "Oria",
    gender: "M",
    birthDate: "22 JUL 1920",
    birthPlace: "Catania, Sicily, Italy",
    deathDate: "15 FEB 2011",
    deathPlace: "San Jose, CA, USA",
    biography: "Placido served as a builder and carpenter, renowned for custom woodwork.",
    story: "Placido could look at a piece of raw walnut and see a cabinet waiting to be carved. His hands were weathered, but his carpentry was as precise as poetry. He built the very dining table that the Oria family gathers around every Sunday.",
    profileUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDdV21vZNuKCT7bAJWBG06x36sxpLse4ZW63yj-td1LmD91psmjWlAc6WZluyETbaR8VSnm-nAd664dNxtQrlfNO5pFxUS8QSxE8wncV8DUuKDu9XPs6mmkzzcXU1EL28GvI9VCskiJvXOt8D-E9DZSQgoB7ypCMZQcUAgjQ5_wAyWF6nBAPf3pcOq1IrxyotjQ_fgFKug9MIR0uKOzmdoD7sEy6eeQ3RZJLTtd9UaVT3FB8wfimjEcPOZ14ELlIQkNWOtGplAw4-v7",
    tags: ["CRAFTSMAN", "LEGACY"],
    recordings: []
  },
  "@I5@": {
    id: "@I5@",
    firstName: "Giuseppe",
    lastName: "Oliveri",
    gender: "M",
    birthDate: "02 FEB 1928",
    birthPlace: "New York, NY, USA",
    deathDate: "11 NOV 2015",
    deathPlace: "Brooklyn, NY, USA",
    biography: "Giuseppe was a local tailor who took over his father's shop.",
    story: "Giuseppe spent his entire life in Brooklyn. He took over the tailor shop on Flatbush Ave and ran it for fifty years. He was known for his quick wit, his sharp suits, and his love of jazz records.",
    profileUrl: "",
    tags: ["BROOKLYN", "TAILOR"],
    recordings: []
  },
  "@I6@": {
    id: "@I6@",
    firstName: "Concetta",
    lastName: "Bella",
    gender: "F",
    birthDate: "19 AUG 1932",
    birthPlace: "Valguarnera Caropepe, Sicily, Italy",
    deathDate: "PRESENT",
    deathPlace: "",
    biography: "Concetta is an active cook and storyteller, living in Brooklyn.",
    story: "Concetta immigrated in the fifties after meeting Giuseppe on a visit back to Sicily. Her kitchen in Brooklyn is a sacred space where the family recipes for pasta al forno and cannoli are kept alive.",
    profileUrl: "",
    tags: ["CHEF", "MATRIARCH"],
    recordings: []
  },
  "@I7@": {
    id: "@I7@",
    firstName: "Marco",
    lastName: "Oria",
    gender: "M",
    birthDate: "24 OCT 1956",
    birthPlace: "Brooklyn, NY, USA",
    deathDate: "PRESENT",
    deathPlace: "",
    biography: "Marco is the family archivist and developer of this project.",
    story: "Marco developed the Kinship Flow Visualizer to preserve his grandparents' stories. He believes that stories not written down are stories forgotten, and has spent years scanning old certificates and recording his aunt's voice.",
    profileUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCMGP1akgrtT2_uhZC0coxoWF-2ElVsHyO6MbTjFUDwngMcJI_Nz8TX58VGCfodUNyjhtxP7yEogmCpEqD-BfWXdj2_LXyR6N6bRuU1T8IIGM4jNEot6SrjbLaNxPko7YXrPuEe3MOclzRNvAGMEjI3gBPPmOdB1pNeM13tu-02Ic3rsNbwziEVk03RPu7Nh6DA2D6eic8M4MNdh0y4nt6jPsP6VW4anWto4uYMFYROXNHNsUuqt99uJTEI39JsdQsA_5xnztkMjKVa",
    tags: ["ARCHIVIST", "STORYTELLER"],
    recordings: []
  },
  "@I8@": {
    id: "@I8@",
    firstName: "Francesca",
    lastName: "Oria",
    gender: "F",
    birthDate: "10 MAY 1960",
    birthPlace: "New York, NY, USA",
    deathDate: "PRESENT",
    deathPlace: "",
    biography: "Francesca is a graphic artist based in Portland, Oregon.",
    story: "Francesca is an illustrator. She loves painting portraits of family members from black-and-white photos, capturing their expressions in watercolor.",
    profileUrl: "",
    tags: ["ARTIST"],
    recordings: []
  },
  "@I9@": {
    id: "@I9@",
    firstName: "Salvatore",
    lastName: "Oliveri",
    gender: "M",
    birthDate: "17 NOV 1962",
    birthPlace: "Brooklyn, NY, USA",
    deathDate: "PRESENT",
    deathPlace: "",
    biography: "Salvatore plays double bass in local jazz bands in New York.",
    story: "",
    profileUrl: "",
    tags: ["MUSICIAN"],
    recordings: []
  },
  "@I10@": {
    id: "@I10@",
    firstName: "Epifania",
    lastName: "Oliveri",
    gender: "F",
    birthDate: "09 SEP 1966",
    birthPlace: "Brooklyn, NY, USA",
    deathDate: "PRESENT",
    deathPlace: "",
    biography: "Epifania is an editor and author, named after her grandmother.",
    story: "",
    profileUrl: "",
    tags: ["WRITER"],
    recordings: []
  }
};

const defaultFamilies: Record<string, Family> = {
  "@F1@": {
    id: "@F1@",
    husbandId: "@I1@",
    wifeId: "@I2@",
    children: ["@I3@", "@I5@"],
    marriageDate: "12 SEP 1915",
    marriagePlace: "Valguarnera Caropepe, Sicily, Italy"
  },
  "@F2@": {
    id: "@F2@",
    husbandId: "@I4@",
    wifeId: "@I3@",
    children: ["@I7@", "@I8@"],
    marriageDate: "25 JUN 1950",
    marriagePlace: "New York, NY, USA"
  },
  "@F3@": {
    id: "@F3@",
    husbandId: "@I5@",
    wifeId: "@I6@",
    children: ["@I9@", "@I10@"],
    marriageDate: "14 JUN 1958",
    marriagePlace: "Brooklyn, NY, USA"
  }
};

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [individuals, setIndividuals] = useState<Record<string, Individual>>({});
  const [families, setFamilies] = useState<Record<string, Family>>({});
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [activeView, setActiveView] = useState<"tree" | "stories" | "archive">("tree");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState("");

  // Load from local storage or set defaults
  useEffect(() => {
    const cachedData = localStorage.getItem("kinship_flow_data");
    const cachedApiKey = localStorage.getItem("kinship_gemini_api_key");

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setIndividuals(parsed.individuals || {});
        setFamilies(parsed.families || {});
        setDocuments(parsed.documents || initialDocuments);
      } catch (e) {
        console.error("Error loading cached family data", e);
        setIndividuals(defaultIndividuals);
        setFamilies(defaultFamilies);
        setDocuments(initialDocuments);
      }
    } else {
      setIndividuals(defaultIndividuals);
      setFamilies(defaultFamilies);
      setDocuments(initialDocuments);
    }

    if (cachedApiKey) {
      setGeminiApiKey(cachedApiKey);
    }
  }, []);

  // Sync to local storage
  const syncToLocalStorage = (
    indis: Record<string, Individual>,
    fams: Record<string, Family>,
    docs: ArchiveDocument[]
  ) => {
    localStorage.setItem(
      "kinship_flow_data",
      JSON.stringify({ individuals: indis, families: fams, documents: docs })
    );
  };

  const selectNode = (id: string | null) => {
    setSelectedNodeId(id);
  };

  const updateIndividual = (id: string, updates: Partial<Individual>) => {
    setIndividuals(prev => {
      const next = {
        ...prev,
        [id]: { ...prev[id], ...updates }
      };
      syncToLocalStorage(next, families, documents);
      return next;
    });
  };

  const updateFamily = (id: string, updates: Partial<Family>) => {
    setFamilies(prev => {
      const next = {
        ...prev,
        [id]: { ...prev[id], ...updates }
      };
      syncToLocalStorage(individuals, next, documents);
      return next;
    });
  };

  const addIndividual = (individual: Individual) => {
    setIndividuals(prev => {
      const next = {
        ...prev,
        [individual.id]: individual
      };
      syncToLocalStorage(next, families, documents);
      return next;
    });
  };

  const addFamily = (family: Family) => {
    setFamilies(prev => {
      const next = {
        ...prev,
        [family.id]: family
      };
      syncToLocalStorage(individuals, next, documents);
      return next;
    });
  };

  const deleteIndividual = (id: string) => {
    setIndividuals(prev => {
      const nextIndis = { ...prev };
      delete nextIndis[id];

      // Remove individual from families they are in
      const nextFams = { ...families };
      Object.keys(nextFams).forEach(famId => {
        const fam = nextFams[famId];
        let changed = false;
        const newFam = { ...fam };

        if (newFam.husbandId === id) {
          delete newFam.husbandId;
          changed = true;
        }
        if (newFam.wifeId === id) {
          delete newFam.wifeId;
          changed = true;
        }
        if (newFam.children.includes(id)) {
          newFam.children = newFam.children.filter(cid => cid !== id);
          changed = true;
        }

        if (changed) {
          nextFams[famId] = newFam;
        }
      });

      setFamilies(nextFams);
      syncToLocalStorage(nextIndis, nextFams, documents);
      return nextIndis;
    });

    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
  };

  const importGedcom = (rawText: string) => {
    try {
      const parsed = parseGedcom(rawText);
      
      // Merge parsed individuals and families with existing documents
      setIndividuals(parsed.individuals);
      setFamilies(parsed.families);
      setSelectedNodeId(null);
      syncToLocalStorage(parsed.individuals, parsed.families, documents);
    } catch (e) {
      console.error("Error parsing GEDCOM file:", e);
      alert("Failed to parse GEDCOM file. Please make sure the format is valid.");
    }
  };

  const exportGedcom = () => {
    return exportToGedcom({ individuals, families, documents });
  };

  const saveApiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem("kinship_gemini_api_key", key);
  };

  const addDocument = (doc: ArchiveDocument) => {
    setDocuments(prev => {
      const next = [doc, ...prev];
      syncToLocalStorage(individuals, families, next);
      return next;
    });
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => {
      const next = prev.filter(doc => doc.id !== id);
      syncToLocalStorage(individuals, families, next);
      return next;
    });
  };

  return (
    <FamilyContext.Provider
      value={{
        individuals,
        families,
        documents,
        activeView,
        selectedNodeId,
        geminiApiKey,
        setActiveView,
        selectNode,
        updateIndividual,
        updateFamily,
        addIndividual,
        addFamily,
        deleteIndividual,
        importGedcom,
        exportGedcom,
        setGeminiApiKey: saveApiKey,
        addDocument,
        deleteDocument
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error("useFamily must be used within a FamilyProvider");
  }
  return context;
};
