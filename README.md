# Geomagnetic multipoles

A browser playground for independently orienting and adding axisymmetric dipole, quadrupole and octupole fields, and examining their effect on paleomagnetic inclination and declination.

**Website:** https://duserzym.github.io/geomagnetic-multipoles/

## Explore

- Adjust each component's amplitude, tilt from geographic north (0–180°), and axis azimuth (−180–180°, east of longitude 0°). Spin about its symmetry axis has no effect and needs no control.
- Reset axes to axial while preserving amplitudes. Examples reset amplitudes and axes together.
- Compare true 3D traces with selected-meridian and equatorial-plane camera projections. Traces can leave their seed meridian; these projections are not planar field-line solutions.
- Display field lines, surface field vectors, both together, or a radial-field lobe glyph.
- Color the surface by radial polarity, signed radial field, field magnitude, or inclination; choose among three palettes.
- Move the latitude and longitude probe and inspect north/east/down, inclination, declination, the fixed geographic GAD reference and an assumption-dependent apparent latitude proxy.
- Switch the head-to-tail vector diagram between north/down and north/east projections. Inclination always uses the full horizontal magnitude.
- Inspect the latitude transect at the selected longitude and the colored component axes in the scene.
- Read the equation setup, sign conventions and six-loop explanation on the page.

The lobe glyph encodes the radial field sampled on a unit reference sphere. Its radius is 0.012 + 1.7 |Br| / sampled_max_surface |Br|. It is neither a physical surface nor a field-line trajectory. Color scales are recomputed over the full sphere for the current mixture, including its orientations. The line density is illustrative and is not a flux-density measurement.

Each degree retains an axisymmetric shape about its own axis. Rotating it generally introduces nonzero orders in geographic coordinates, but does not span all degree-2 or degree-3 fields. A general quadrupole has five coefficients (and two multipole axes); a general octupole has seven coefficients. These additional shape parameters are outside this playground.

## Run and edit

No npm packages need to be installed. Building uses Python 3; the scientific tests use Node.js 18 or newer.

    npm test
    npm run build
    npm run preview

Open http://127.0.0.1:8000. Edit src/playground.html and rebuild to update the standalone index.html. The checked-in export runs on static hosts without Python or Node. Three.js, D3 and KaTeX load from pinned CDN URLs, so an internet connection is needed.

The export helper and presentation assets in tools/ preserve the original inline visualization's controls, theme and browser-local state. State schema v2 stores independent orientations, probe longitude and vector projection; v1 saves reopen with axial orientations and longitude 0°. No sign-in, private data, external service API, or backend is used by the playground.

The 18 numerical/state tests cover axial regressions, an analytic tilted dipole, finite-difference potential gradients, rotation covariance (including 3D traces), superposition, radial decay, even/odd axis reversal, longitude/declination, null directions, full-sphere normalization and v1 migration. Optional browser QA uses an already installed Playwright (`npm run test:browser`); it checks controls, all cameras/displays/colors, persistence, reset/presets, mobile layout, null fields and v1 reload. Set `PREVIEW_URL` to the running preview URL and `QA_OUTPUT` for screenshots and its JSON report. Playwright is not an application dependency.

## Mathematical setup

Let a be the reference radius, rho = r/a, rhat the world radial unit vector, and axis_n the unit symmetry axis of degree n. World coordinates use +Y for geographic north, +X for the equator at longitude 0°, and +Z for 90°E. Tilt t and azimuth alpha are measured in degrees. The fixed field scale is B0 > 0, with local-axis Gauss coefficients

    axis_n = (sin(t_n) cos(alpha_n), cos(t_n), sin(t_n) sin(alpha_n))
    u_n = axis_n dot rhat
    (g1, g2, g3) = -B0 (D, Q, O).
    P1(mu) = mu
    P2(mu) = (3 mu^2 - 1)/2
    P3(mu) = (5 mu^3 - 3 mu)/2

    Vn = a gn rho^(-n-1) Pn(u_n)
    V = V1 + V2 + V3
    B = -grad V

    Bn = gn rho^(-n-2) [((n+1) Pn(u_n) + u_n Pn'(u_n)) rhat
                         - Pn'(u_n) axis_n]

The Cartesian vectors are added before projecting onto geographic north, east and down at the selected latitude and longitude. The same evaluator drives true 3D RK4 traces, colors, surface arrows, radial glyphs and probe readings.

For the axial reference case only, all tilts are 0°, mu = sin(latitude), c = cos(latitude), gn = gn^0, BE = 0. At the reference surface (rho = 1):

    BN/B0 = c [D + 3 Q mu + (3/2) O (5 mu^2 - 1)]
    BD/B0 = 2 D mu + (3/2) Q (3 mu^2 - 1) + 2 O (5 mu^3 - 3 mu)

For arbitrary orientations:

    H = hypot(BN, BE)
    I = atan2(BD, H)
    declination = atan2(BE, BN)
    G2 = Q/D, G3 = O/D, when D > 0 (local-axis amplitude ratios)

North is positive northward, east is positive eastward, and down is positive into Earth. Inclination uses the nonnegative full horizontal-field magnitude, including when north changes sign. Directions are undefined for magnitude ≤ 1e-9 B0; declination is also undefined for H ≤ 1e-9 B0.

For a normal geocentric axial dipole (GAD), tan(I) = 2 tan(latitude). The apparent GAD latitude proxy is atan2(BD, 2H). It assumes a normal geographic GAD, so it is suppressed for southward or vertical directions (BN ≤ 1e-9 B0) and null fields. No automatic polarity correction is applied. Tilted and nondipole fields violate the assumed model; the proxy is not a geographic latitude estimate. The GAD comparison remains fixed to geographic north even if the dipole component is tilted.

For D = 1, Q = 0, O = +0.15, with all tilts 0°, at 30°N, BN/B0 = 0.9147393, BD/B0 = 0.7375 and I = 38.8772°, compared with the GAD prediction 49.1066°. A GAD interpretation gives an apparent latitude of 21.9554°N. This illustrates one proposed mechanism; the playground is not an IGRF reconstruction or a model of sediment compaction.

## Six visible loop regions

The pure axial octupole (n = 3, m = 0) has three field-line cells in each meridional half-plane, hence six loop regions in a full profile. Its radial-field surface pattern instead consists of two polar caps and two latitude belts. Other degree-3 orders have different geometries.

Br is zero at latitudes 0° and ±50.7685°. Btheta is zero at ±26.5651°, which separate the three meridional cells on each side of the axis. These descriptions apply in the component's symmetry frame: tilting rotates the pattern intact. The word octupole specifies harmonic degree 3; it does not prescribe eight visible loops for every representation.

## Publishing

GitHub Pages serves index.html from the root of main. .nojekyll disables unnecessary Jekyll processing. After editing, run the tests, rebuild, and commit the updated source and export to main.

## Sources and dependencies

- [Winch & Slaucitajs (1966), Geomagnetic multipoles, 1965.0 — strengths and axes](https://doi.org/10.1007/BF00874956)
- [Willis (1982), A direct analytic method of calculating the quadrupole parameters of a planetary magnetic field — general quadrupole and its two axes](https://doi.org/10.1111/j.1365-246X.1982.tb04926.x)
- [NOAA: International Geomagnetic Reference Field and potential convention](https://www.ncei.noaa.gov/products/international-geomagnetic-reference-field)
- [UCLA: multipole coefficients and geometries](https://spacephysics.ucla.edu/PotentialField/RotatablePotentialFields.html)
- [Heimpel and Evans (2013), Testing the geomagnetic dipole and reversing dynamo models over Earth's cooling history](https://doi.org/10.1016/j.pepi.2013.07.007)
- [Three.js](https://threejs.org/) 0.160.1 — MIT
- [D3](https://d3js.org/) 7.9.0 — ISC
- [KaTeX](https://katex.org/) 0.16.11 — MIT
