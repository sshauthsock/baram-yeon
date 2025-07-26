import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Update this to your actual JSON file name
const INPUT_FILE = "output/transform.json"; // Change this to your actual file name

try {
  // Read the original JSON file
  const rawData = readFileSync(INPUT_FILE, "utf8");
  const originalData = JSON.parse(rawData);

  // Create registration stat file structure
  const registrationData = {
    data: originalData.data.map((guardian) => {
      return {
        name: guardian.name,
        image: guardian.image,
        stats: guardian.stats.map((stat) => {
          return {
            level: stat.level,
            registrationStat: stat.registrationStat,
          };
        }),
        influence: guardian.influence,
        type: guardian.type,
        grade: guardian.grade,
      };
    }),
  };

  // Create bind stat file structure
  const bindData = {
    data: originalData.data.map((guardian) => {
      return {
        name: guardian.name,
        image: guardian.image,
        stats: guardian.stats.map((stat) => {
          return {
            level: stat.level,
            bindStat: stat.bindStat,
          };
        }),
        influence: guardian.influence,
        type: guardian.type,
        grade: guardian.grade,
      };
    }),
  };

  // Write the files
  writeFileSync(
    "output/transform-registration-stats.json",
    JSON.stringify(registrationData, null, 2)
  );
  writeFileSync(
    "output/transform-bind-stats.json",
    JSON.stringify(bindData, null, 2)
  );

  console.log("Files have been successfully created!");
} catch (error) {
  console.error("Error:", error.message);
  console.log("Make sure the input file exists and contains valid JSON data.");
}
