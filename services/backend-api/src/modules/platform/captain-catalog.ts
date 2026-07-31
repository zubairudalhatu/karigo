export interface CaptainServiceArea {
  id: string;
  stateCode: string;
  stateName: string;
  cityCode: string;
  cityName: string;
  isActive: boolean;
}

export interface CaptainServiceAreaCatalog {
  version: string;
  areas: CaptainServiceArea[];
}

export interface VehicleCatalogOption {
  value: string;
  label: string;
}

export interface VehicleMakeOption extends VehicleCatalogOption {
  models: VehicleCatalogOption[];
}

export interface VehicleCatalog {
  version: string;
  earliestYear: number;
  vehicleTypes: VehicleCatalogOption[];
  makes: VehicleMakeOption[];
  years: number[];
  colours: VehicleCatalogOption[];
}

export const CAPTAIN_SERVICE_AREA_CATALOG_VERSION = "2026-07-31";

export const captainServiceAreas: CaptainServiceArea[] = [
  {
    id: "kano-kano",
    stateCode: "KANO",
    stateName: "Kano State",
    cityCode: "KANO",
    cityName: "Kano",
    isActive: true
  },
  {
    id: "fct-abuja",
    stateCode: "FCT",
    stateName: "Federal Capital Territory",
    cityCode: "ABUJA",
    cityName: "Abuja",
    isActive: true
  }
];

const models = (items: string[]): VehicleCatalogOption[] =>
  items.map((label) => ({
    label,
    value: label
      .toUpperCase()
      .replace(/&/g, "AND")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  }));

export const vehicleMakes: VehicleMakeOption[] = [
  { value: "TOYOTA", label: "Toyota", models: models(["Camry", "Corolla", "Avalon", "Yaris", "Prius", "Crown", "RAV4", "Highlander", "Land Cruiser", "Prado", "Venza", "Sienna", "Hilux", "Hiace", "Avanza", "Fortuner", "Coaster", "Other"]) },
  { value: "HONDA", label: "Honda", models: models(["Accord", "Civic", "City", "CR-V", "HR-V", "Pilot", "Odyssey", "Crosstour", "Fit/Jazz", "Ridgeline", "Other"]) },
  { value: "LEXUS", label: "Lexus", models: models(["ES", "IS", "GS", "LS", "RX", "NX", "GX", "LX", "UX", "Other"]) },
  { value: "NISSAN", label: "Nissan", models: models(["Altima", "Maxima", "Sentra", "Sunny", "Almera", "Teana", "Murano", "Rogue", "X-Trail", "Pathfinder", "Patrol", "Navara", "Urvan", "Other"]) },
  { value: "HYUNDAI", label: "Hyundai", models: models(["Accent", "Elantra", "Sonata", "Azera", "Tucson", "Santa Fe", "Creta", "Venue", "H1", "Other"]) },
  { value: "KIA", label: "Kia", models: models(["Rio", "Cerato", "Optima", "K5", "Sportage", "Sorento", "Picanto", "Soul", "Carnival", "Other"]) },
  { value: "MERCEDES_BENZ", label: "Mercedes-Benz", models: models(["A-Class", "C-Class", "E-Class", "S-Class", "CLA", "GLA", "GLC", "GLE", "GLS", "Sprinter", "Vito", "Other"]) },
  { value: "BMW", label: "BMW", models: models(["1 Series", "3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X6", "Other"]) },
  { value: "FORD", label: "Ford", models: models(["Focus", "Fusion", "Taurus", "Escape", "Edge", "Explorer", "Ranger", "Transit", "Other"]) },
  { value: "VOLKSWAGEN", label: "Volkswagen", models: models(["Golf", "Jetta", "Passat", "Polo", "Tiguan", "Touareg", "Transporter", "Other"]) },
  { value: "PEUGEOT", label: "Peugeot", models: models(["206", "207", "301", "307", "308", "406", "407", "508", "Partner", "Boxer", "Other"]) },
  { value: "MAZDA", label: "Mazda", models: models(["Mazda 2", "Mazda 3", "Mazda 6", "CX-3", "CX-5", "CX-7", "CX-9", "BT-50", "Other"]) },
  { value: "MITSUBISHI", label: "Mitsubishi", models: models(["Lancer", "Galant", "Outlander", "Pajero", "ASX", "L200", "Space Wagon", "Other"]) },
  { value: "SUZUKI", label: "Suzuki", models: models(["Alto", "Swift", "Baleno", "Ciaz", "Vitara", "Grand Vitara", "Carry", "Every", "Other"]) },
  { value: "CHEVROLET", label: "Chevrolet", models: models(["Aveo", "Cruze", "Malibu", "Spark", "Captiva", "Trailblazer", "Tahoe", "Other"]) },
  { value: "RENAULT", label: "Renault", models: models(["Logan", "Duster", "Sandero", "Koleos", "Megane", "Kangoo", "Master", "Other"]) },
  { value: "VOLVO", label: "Volvo", models: models(["S40", "S60", "S80", "XC40", "XC60", "XC90", "Other"]) },
  { value: "LAND_ROVER", label: "Land Rover", models: models(["Discovery", "Defender", "Freelander", "Range Rover Sport", "Range Rover Evoque", "Other"]) },
  { value: "RANGE_ROVER", label: "Range Rover", models: models(["Vogue", "Sport", "Evoque", "Velar", "Autobiography", "Other"]) },
  { value: "JEEP", label: "Jeep", models: models(["Cherokee", "Grand Cherokee", "Compass", "Wrangler", "Patriot", "Renegade", "Other"]) },
  { value: "AUDI", label: "Audi", models: models(["A3", "A4", "A6", "A8", "Q3", "Q5", "Q7", "Other"]) },
  { value: "INFINITI", label: "Infiniti", models: models(["G35", "G37", "M35", "Q50", "QX50", "QX60", "QX80", "Other"]) },
  { value: "ACURA", label: "Acura", models: models(["TL", "TSX", "RL", "MDX", "RDX", "ZDX", "Other"]) },
  { value: "ISUZU", label: "Isuzu", models: models(["D-Max", "MU-X", "NPR", "NQR", "Trooper", "Other"]) },
  { value: "GAC", label: "GAC", models: models(["GA3", "GA4", "GA8", "GS3", "GS4", "GS8", "Other"]) },
  { value: "CHANGAN", label: "Changan", models: models(["Alsvin", "CS35", "CS55", "CS75", "Eado", "Other"]) },
  { value: "GEELY", label: "Geely", models: models(["Emgrand", "Coolray", "Azkarra", "Tugella", "Okavango", "Other"]) },
  { value: "JAC", label: "JAC", models: models(["J4", "J5", "S2", "S3", "S5", "T6", "Sunray", "Other"]) },
  { value: "MG", label: "MG", models: models(["MG3", "MG5", "ZS", "HS", "RX5", "Other"]) },
  { value: "BYD", label: "BYD", models: models(["F3", "Qin", "Song", "Tang", "Yuan", "Dolphin", "Atto 3", "Other"]) },
  { value: "BAJAJ", label: "Bajaj", models: models(["Boxer", "Pulsar", "Discover", "RE", "Qute", "Other"]) },
  { value: "TVS", label: "TVS", models: models(["Apache", "HLX", "Jupiter", "King", "Other"]) },
  { value: "QINGQI", label: "Qingqi", models: models(["QM125", "QM200", "Tricycle", "Other"]) },
  { value: "PIAGGIO", label: "Piaggio", models: models(["Ape", "Liberty", "Medley", "Other"]) },
  { value: "OTHER", label: "Other", models: models(["Other"]) }
];

export const vehicleColours: VehicleCatalogOption[] = [
  { value: "BLACK", label: "Black" },
  { value: "WHITE", label: "White" },
  { value: "PEARL_WHITE", label: "Pearl White" },
  { value: "SILVER", label: "Silver" },
  { value: "GREY", label: "Grey" },
  { value: "CHARCOAL", label: "Charcoal" },
  { value: "RED", label: "Red" },
  { value: "MAROON", label: "Maroon" },
  { value: "BLUE", label: "Blue" },
  { value: "NAVY_BLUE", label: "Navy Blue" },
  { value: "GREEN", label: "Green" },
  { value: "BROWN", label: "Brown" },
  { value: "BEIGE", label: "Beige" },
  { value: "GOLD", label: "Gold" },
  { value: "CREAM", label: "Cream" },
  { value: "YELLOW", label: "Yellow" },
  { value: "ORANGE", label: "Orange" },
  { value: "PURPLE", label: "Purple" },
  { value: "OTHER", label: "Other" }
];

export const captainVehicleTypes: VehicleCatalogOption[] = [
  { value: "MOTORCYCLE", label: "Motorcycle" },
  { value: "BICYCLE", label: "Bicycle" },
  { value: "TRICYCLE", label: "Tricycle" },
  { value: "CAR", label: "Car" },
  { value: "VAN", label: "Van" },
  { value: "SEDAN", label: "Sedan" },
  { value: "SUV", label: "SUV" },
  { value: "MINI_BUS", label: "Mini bus" },
  { value: "OTHER", label: "Other" }
];

export function vehicleYears(currentYear = new Date().getFullYear(), earliestYear = 1980): number[] {
  return Array.from({ length: currentYear - earliestYear + 1 }, (_, index) => currentYear - index);
}

export function captainServiceAreaCatalog(): CaptainServiceAreaCatalog {
  return {
    version: CAPTAIN_SERVICE_AREA_CATALOG_VERSION,
    areas: captainServiceAreas
  };
}

export function vehicleCatalog(currentYear = new Date().getFullYear()): VehicleCatalog {
  return {
    version: "2026-07-31",
    earliestYear: 1980,
    vehicleTypes: captainVehicleTypes,
    makes: vehicleMakes,
    years: vehicleYears(currentYear),
    colours: vehicleColours
  };
}
