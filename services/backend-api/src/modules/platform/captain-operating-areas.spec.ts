import {
  captainIsApprovedForOperatingArea,
  captainOperatingAreaFromCoordinates,
  captainOperatingAreaProjection,
  resolveCaptainOperatingAuthorization
} from "./captain-operating-areas";

describe("Captain operating areas", () => {
  const multiCityApplication = {
    operatingAreaIds: ["kano-kano", "fct-abuja"],
    primaryOperatingAreaId: "kano-kano",
    city: "Kano",
    state: "Kano State"
  };

  it("authorizes every approved area without treating the primary area as exclusive", () => {
    expect(captainIsApprovedForOperatingArea(multiCityApplication, "kano-kano")).toBe(true);
    expect(captainIsApprovedForOperatingArea(multiCityApplication, "fct-abuja")).toBe(true);
    expect(captainOperatingAreaProjection(multiCityApplication)).toMatchObject({
      approvedOperatingAreas: [
        { id: "kano-kano", cityName: "Kano" },
        { id: "fct-abuja", cityName: "Abuja" }
      ],
      primaryOperatingArea: { id: "kano-kano", cityName: "Kano" },
      operatingAreasRequireReview: false
    });
  });

  it("does not turn current GPS into permanent approval", () => {
    const abuja = captainOperatingAreaFromCoordinates(9.0765, 7.3986);
    expect(abuja?.id).toBe("fct-abuja");
    expect(captainIsApprovedForOperatingArea(
      { ...multiCityApplication, operatingAreaIds: ["kano-kano"] },
      abuja!.id
    )).toBe(false);
  });

  it("keeps the conservative residential fallback for legacy empty arrays and flags review", () => {
    const legacy = resolveCaptainOperatingAuthorization(
      { operatingAreaIds: [], primaryOperatingAreaId: null, city: "Kano", state: "Kano State" },
      { city: "Kano", state: "Kano State" }
    );
    expect(legacy.authorizedAreaIds).toEqual(["kano-kano"]);
    expect(legacy.approvedAreas).toEqual([]);
    expect(legacy.operatingAreasRequireReview).toBe(true);
    expect(captainOperatingAreaProjection({ operatingAreaIds: [], city: "Kano" })).toMatchObject({
      approvedOperatingAreas: [],
      primaryOperatingArea: null,
      operatingAreasRequireReview: true,
      operatingAreasReviewMessage: "Operating areas require review"
    });
  });

  it("fails safely when a legacy application has no resolvable operating location", () => {
    expect(resolveCaptainOperatingAuthorization({ operatingAreaIds: [] }).authorizedAreaIds).toEqual([]);
  });
});
