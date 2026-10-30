# Geomagnetic multipoles

A browser playground for adding axial dipole, quadrupole and octupole fields and examining the proposed geomagnetic contribution to paleomagnetic inclination shallowing.

**Website:** https://duserzym.github.io/geomagnetic-multipoles/

## Explore

- Independently adjust signed dipole, quadrupole and octupole weights.
- Compare a 3D view, a meridional profile and an equatorial projection.
- Display field lines, surface field vectors, both together, or a radial-field lobe glyph.
- Color the surface by radial polarity, signed radial field, field magnitude, or inclination; choose among three palettes.
- Move the latitude probe and inspect the local vector sum, inclination, GAD reference and apparent latitude.
- Read the equation setup, sign conventions and six-loop explanation on the page.

The lobe glyph encodes the radial field sampled on a unit reference sphere. Its radius is 0.012 + 1.7 |Br| / max_surface |Br|. It is neither a physical surface nor a field-line trajectory. Color scales are recomputed for the current mixture. The line density is illustrative and is not a flux-density measurement.

## Run and edit

No npm packages need to be installed. Building uses Python 3; the scientific tests use Node.js 18 or newer.

    npm test
    npm run build
    npm run preview

Open http://127.0.0.1:8000. Edit src/playground.html and rebuild to update the standalone index.html. The checked-in export runs on static hosts without Python or Node. Three.js, D3 and KaTeX load from pinned CDN URLs, so an internet connection is needed.

The export helper and presentation assets in tools/ preserve the original inline visualization's controls, theme and browser-local state. No sign-in, private data, external service API, or backend is used by the playground.

## Mathematical setup

Only axial, axisymmetric terms (m = 0) are included. Let a be the reference radius, rho = r/a, mu = cos(theta) = sin(latitude) and c = cos(latitude). The fixed field scale is B0 > 0, with Gauss coefficients

    (g1^0, g2^0, g3^0) = -B0 (D, Q, O).
    P1(mu) = mu
    P2(mu) = (3 mu^2 - 1)/2
    P3(mu) = (5 mu^3 - 3 mu)/2

    Vn = a gn^0 rho^(-n-1) Pn(mu)
    V = V1 + V2 + V3
    B = -grad V

    Br,n = (n+1) gn^0 rho^(-n-2) Pn(mu)
    BN,n = -gn^0 rho^(-n-2) c Pn'(mu)
    BE = 0
    BD = -Br

At the reference surface (rho = 1):

    BN/B0 = c [D + 3 Q mu + (3/2) O (5 mu^2 - 1)]
    BD/B0 = 2 D mu + (3/2) Q (3 mu^2 - 1) + 2 O (5 mu^3 - 3 mu)
    I = atan2(BD, abs(BN))
    G2 = Q/D, G3 = O/D, when D > 0

North is positive northward and down is positive into Earth. The plotted inclination uses the nonnegative horizontal-field magnitude, including cases where the northward component changes sign. The apparent GAD latitude is shown only for nonzero field with a positive northward component.

For a normal geocentric axial dipole (GAD), tan(I) = 2 tan(latitude). Applying that relation to the combined-field inclination gives the apparent latitude atan(tan(I)/2). This is a deliberately incorrect dipole interpretation when nondipole terms are present.

For D = 1, Q = 0, O = +0.15 at 30°N, BN/B0 = 0.9147393, BD/B0 = 0.7375 and I = 38.8772°, compared with the GAD prediction 49.1066°. A GAD interpretation gives an apparent latitude of 21.9554°N. This illustrates one proposed mechanism; the playground is not an IGRF reconstruction or a model of sediment compaction.

## Six visible loop regions

The pure axial octupole (n = 3, m = 0) has three field-line cells in each meridional half-plane, hence six loop regions in a full profile. Its radial-field surface pattern instead consists of two polar caps and two latitude belts. Other degree-3 orders have different geometries.

Br is zero at latitudes 0° and ±50.7685°. Btheta is zero at ±26.5651°, which separate the three meridional cells on each side of the axis. The word octupole specifies harmonic degree 3; it does not prescribe eight visible loops for every representation.

## Publishing

GitHub Pages serves index.html from the root of main. .nojekyll disables unnecessary Jekyll processing. After editing, run the tests, rebuild, and commit the updated source and export to main.

## Sources and dependencies

- [NOAA: International Geomagnetic Reference Field and potential convention](https://www.ncei.noaa.gov/products/international-geomagnetic-reference-field)
- [UCLA: multipole coefficients and geometries](https://spacephysics.ucla.edu/PotentialField/RotatablePotentialFields.html)
- [Heimpel and Evans (2013), Testing the geomagnetic dipole and reversing dynamo models over Earth's cooling history](https://doi.org/10.1016/j.pepi.2013.07.007)
- [Three.js](https://threejs.org/) 0.160.1 — MIT
- [D3](https://d3js.org/) 7.9.0 — ISC
- [KaTeX](https://katex.org/) 0.16.11 — MIT
