export interface Recording {
  id: string;
  name: string;
  date: string;
  url: string;
  duration: string;
}

export interface ArchiveDocument {
  id: string;
  title: string;
  date: string;
  category: "Photos" | "Documents" | "Letters";
  tags: string[];
  url: string;
  description: string;
  verified: boolean;
  contributor: string;
}

export interface Individual {
  id: string;
  firstName: string;
  lastName: string;
  gender: "M" | "F" | "U";
  birthDate: string;
  birthPlace: string;
  deathDate: string;
  deathPlace: string;
  biography: string; // Short notes
  story: string;     // Immersive long story
  profileUrl: string;
  tags: string[];
  recordings: Recording[];
}

export interface Family {
  id: string;
  husbandId?: string;
  wifeId?: string;
  children: string[];
  marriageDate: string;
  marriagePlace: string;
}

export interface FamilyTreeData {
  individuals: Record<string, Individual>;
  families: Record<string, Family>;
  documents: ArchiveDocument[];
}

// Custom parser for GEDCOM format
export function parseGedcom(rawText: string): FamilyTreeData {
  const individuals: Record<string, Individual> = {};
  const families: Record<string, Family> = {};
  
  // Keep track of current entities
  let currentIndi: Partial<Individual> | null = null;
  let currentFam: Partial<Family> | null = null;
  let currentEvent: "BIRT" | "DEAT" | "MARR" | null = null;
  let currentTextField: "BIOGRAPHY" | "STORY" | null = null;

  const lines = rawText.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Regex to match level, optional cross-reference pointer, tag, and value
    // E.g.: "0 @I1@ INDI", "1 NAME Vincenzo /Oliveri/", "2 DATE 1892"
    const match = line.match(/^(\d+)\s+(?:(@[A-Z0-9_]+@)\s+)?([A-Z0-9_]+)(?:\s+(.*))?$/i);
    if (!match) continue;

    const level = parseInt(match[1], 10);
    const pointer = match[2];
    const tag = match[3];
    const value = match[4]?.trim() || "";

    if (level === 0) {
      // Save previously parsing elements
      if (currentIndi && currentIndi.id) {
        individuals[currentIndi.id] = finalizeIndividual(currentIndi);
      }
      if (currentFam && currentFam.id) {
        families[currentFam.id] = finalizeFamily(currentFam);
      }

      currentIndi = null;
      currentFam = null;
      currentEvent = null;
      currentTextField = null;

      if (tag === "INDI" && pointer) {
        currentIndi = {
          id: pointer,
          firstName: "",
          lastName: "",
          gender: "U",
          birthDate: "",
          birthPlace: "",
          deathDate: "",
          deathPlace: "",
          biography: "",
          story: "",
          profileUrl: "",
          tags: [],
          recordings: []
        };
      } else if (tag === "FAM" && pointer) {
        currentFam = {
          id: pointer,
          children: [],
          marriageDate: "",
          marriagePlace: ""
        };
      }
    } else if (level === 1) {
      currentEvent = null;
      currentTextField = null;

      if (currentIndi) {
        switch (tag) {
          case "NAME": {
            // E.g., "Vincenzo /Oliveri/"
            const nameParts = value.split("/");
            currentIndi.firstName = nameParts[0]?.trim() || "";
            currentIndi.lastName = nameParts[1]?.trim() || "";
            break;
          }
          case "SEX":
            currentIndi.gender = (value.toUpperCase() === "M" ? "M" : value.toUpperCase() === "F" ? "F" : "U") as any;
            break;
          case "BIRT":
            currentEvent = "BIRT";
            break;
          case "DEAT":
            currentEvent = "DEAT";
            break;
          case "NOTE":
            currentIndi.biography = value;
            currentTextField = "BIOGRAPHY";
            break;
          case "_PHOTO":
            currentIndi.profileUrl = value;
            break;
          case "_STORY":
            currentIndi.story = value;
            currentTextField = "STORY";
            break;
          case "_TAGS":
            currentIndi.tags = value.split(",").map(t => t.trim()).filter(Boolean);
            break;
          case "_RECORDING": {
            // value is formatted as "id|name|date|url|duration"
            const recParts = value.split("|");
            if (recParts.length >= 5) {
              currentIndi.recordings?.push({
                id: recParts[0],
                name: recParts[1],
                date: recParts[2],
                url: recParts[3],
                duration: recParts[4]
              });
            }
            break;
          }
        }
      } else if (currentFam) {
        switch (tag) {
          case "HUSB":
            currentFam.husbandId = value;
            break;
          case "WIFE":
            currentFam.wifeId = value;
            break;
          case "CHIL":
            currentFam.children?.push(value);
            break;
          case "MARR":
            currentEvent = "MARR";
            break;
        }
      }
    } else if (level >= 2) {
      // Handle subfields (like date, place, note continuations)
      if (currentIndi) {
        if (currentEvent === "BIRT") {
          if (tag === "DATE") currentIndi.birthDate = value;
          else if (tag === "PLAC") currentIndi.birthPlace = value;
        } else if (currentEvent === "DEAT") {
          if (tag === "DATE") currentIndi.deathDate = value;
          else if (tag === "PLAC") currentIndi.deathPlace = value;
        } else if (tag === "CONC" || tag === "CONT") {
          const sep = tag === "CONT" ? "\n" : "";
          if (currentTextField === "BIOGRAPHY") {
            currentIndi.biography = (currentIndi.biography || "") + sep + value;
          } else if (currentTextField === "STORY") {
            currentIndi.story = (currentIndi.story || "") + sep + value;
          }
        }
      } else if (currentFam) {
        if (currentEvent === "MARR") {
          if (tag === "DATE") currentFam.marriageDate = value;
          else if (tag === "PLAC") currentFam.marriagePlace = value;
        }
      }
    }
  }

  // Finalize last elements
  if (currentIndi && currentIndi.id) {
    individuals[currentIndi.id] = finalizeIndividual(currentIndi);
  }
  if (currentFam && currentFam.id) {
    families[currentFam.id] = finalizeFamily(currentFam);
  }

  return {
    individuals,
    families,
    documents: [] // Documents are stored separately or parsed if needed
  };
}

function finalizeIndividual(p: Partial<Individual>): Individual {
  return {
    id: p.id || "",
    firstName: p.firstName || "Unknown",
    lastName: p.lastName || "",
    gender: p.gender || "U",
    birthDate: p.birthDate || "",
    birthPlace: p.birthPlace || "",
    deathDate: p.deathDate || "",
    deathPlace: p.deathPlace || "",
    biography: p.biography || "",
    story: p.story || "",
    profileUrl: p.profileUrl || "",
    tags: p.tags || [],
    recordings: p.recordings || []
  };
}

function finalizeFamily(f: Partial<Family>): Family {
  return {
    id: f.id || "",
    husbandId: f.husbandId,
    wifeId: f.wifeId,
    children: f.children || [],
    marriageDate: f.marriageDate || "",
    marriagePlace: f.marriagePlace || ""
  };
}

// Helper to wrap text into max 70 char lines for CONC/CONT tags
function formatGedcomTextField(tag: string, text: string): string {
  if (!text) return "";
  const lines = text.split("\n");
  let output = `1 ${tag} ${lines[0].substring(0, 60)}`;
  
  // Concatenate rest of the first line if it exceeded 60 characters
  if (lines[0].length > 60) {
    let remainder = lines[0].substring(60);
    while (remainder.length > 0) {
      output += `\n2 CONC ${remainder.substring(0, 60)}`;
      remainder = remainder.substring(60);
    }
  }

  // Handle continuing lines
  for (let i = 1; i < lines.length; i++) {
    output += `\n2 CONT ${lines[i].substring(0, 60)}`;
    if (lines[i].length > 60) {
      let remainder = lines[i].substring(60);
      while (remainder.length > 0) {
        output += `\n2 CONC ${remainder.substring(0, 60)}`;
        remainder = remainder.substring(60);
      }
    }
  }

  return output;
}

// Export local data state to GEDCOM format
export function exportToGedcom(data: FamilyTreeData): string {
  let ged = "";
  
  // Header
  ged += "0 HEAD\n";
  ged += "1 SOUR KINSHIP_FLOW_VISUALIZER\n";
  ged += "1 GEDC\n";
  ged += "2 VERS 5.5.1\n";
  ged += "2 FORM LINEAGE-LINKED\n";
  ged += "1 CHAR UTF-8\n";

  // Individuals
  Object.values(data.individuals).forEach(indi => {
    ged += `0 ${indi.id} INDI\n`;
    ged += `1 NAME ${indi.firstName} /${indi.lastName}/\n`;
    ged += `1 SEX ${indi.gender}\n`;
    
    if (indi.birthDate || indi.birthPlace) {
      ged += "1 BIRT\n";
      if (indi.birthDate) ged += `2 DATE ${indi.birthDate}\n`;
      if (indi.birthPlace) ged += `2 PLAC ${indi.birthPlace}\n`;
    }

    if (indi.deathDate || indi.deathPlace) {
      ged += "1 DEAT\n";
      if (indi.deathDate) ged += `2 DATE ${indi.deathDate}\n`;
      if (indi.deathPlace) ged += `2 PLAC ${indi.deathPlace}\n`;
    }

    if (indi.profileUrl) {
      ged += `1 _PHOTO ${indi.profileUrl}\n`;
    }

    if (indi.tags && indi.tags.length > 0) {
      ged += `1 _TAGS ${indi.tags.join(", ")}\n`;
    }

    if (indi.biography) {
      ged += formatGedcomTextField("NOTE", indi.biography) + "\n";
    }

    if (indi.story) {
      ged += formatGedcomTextField("_STORY", indi.story) + "\n";
    }

    if (indi.recordings) {
      indi.recordings.forEach(rec => {
        ged += `1 _RECORDING ${rec.id}|${rec.name}|${rec.date}|${rec.url}|${rec.duration}\n`;
      });
    }
  });

  // Families
  Object.values(data.families).forEach(fam => {
    ged += `0 ${fam.id} FAM\n`;
    if (fam.husbandId) ged += `1 HUSB ${fam.husbandId}\n`;
    if (fam.wifeId) ged += `1 WIFE ${fam.wifeId}\n`;
    fam.children.forEach(childId => {
      ged += `1 CHIL ${childId}\n`;
    });
    if (fam.marriageDate || fam.marriagePlace) {
      ged += "1 MARR\n";
      if (fam.marriageDate) ged += `2 DATE ${fam.marriageDate}\n`;
      if (fam.marriagePlace) ged += `2 PLAC ${fam.marriagePlace}\n`;
    }
  });

  // Trailer
  ged += "0 TRLR\n";

  return ged;
}
