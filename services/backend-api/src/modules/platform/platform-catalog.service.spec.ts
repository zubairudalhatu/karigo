import { PlatformCatalogService } from "./platform-catalog.service";
import { PlatformController } from "./platform.controller";

describe("Platform Captain catalogs", () => {
  const service = new PlatformCatalogService();
  const controller = new PlatformController(service);

  it("loads the Captain vehicle catalog for the public endpoint", () => {
    const response = controller.vehicleCatalog();

    expect(response.message).toBe("Vehicle catalog retrieved");
    expect(response.data.makes.some((make) => make.value === "TOYOTA")).toBe(true);
    expect(response.data.makes.find((make) => make.value === "TOYOTA")?.models.some((model) => model.value === "COROLLA")).toBe(true);
    expect(response.data.colours.some((colour) => colour.value === "BLACK")).toBe(true);
  });

  it("loads active Kano and Abuja Captain service areas for the public endpoint", () => {
    const response = controller.captainServiceAreas();
    const activeAreaIds = response.data.areas.filter((area) => area.isActive).map((area) => area.id);

    expect(response.message).toBe("Captain service areas retrieved");
    expect(activeAreaIds).toEqual(expect.arrayContaining(["kano-kano", "fct-abuja"]));
  });
});
