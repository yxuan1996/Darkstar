import * as THREE from 'three';

/**
 * buildDarkstarModel()
 *
 * Constructs a 3D model of the SR-72 Darkstar using Three.js geometry.
 * Based on reference: 69 ft long, 34 ft wingspan, 12 ft height.
 * We normalize to roughly ±10 units on the longest axis.
 *
 * The Darkstar has:
 *   - Very long, needle-sharp nose
 *   - Flat, blended wing-body (diamond cross-section)
 *   - Smooth chine edges running the full length
 *   - Delta-planform wings blending into the fuselage
 *   - Twin outward-canted vertical stabilizers
 *   - Recessed engine nozzles at the aft
 *   - Low-profile cockpit canopy forward
 *
 * Returns: { wireframeGroup, shadedGroup, allGroups }
 */

// ─── Cross-section generator ──────────────────────────────────────────────────
// The Darkstar has a diamond/lens cross-section that varies along the length
function createCrossSection(halfWidth, topHeight, bottomHeight, chineSharpness = 0.15) {
  // Diamond cross section: top peak, right chine, bottom peak, left chine
  // chineSharpness controls how sharp the side edges are (0 = circle, 1 = pure diamond)
  const points = [];
  const segments = 24;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 2;

    let x, y;
    // Diamond shape with controlled sharpness
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Use superellipse for diamond-ish shape
    const n = 1.2 + chineSharpness * 1.8; // exponent: 2=ellipse, higher=more rectangular, lower=more diamond
    const signX = Math.sign(cos);
    const signY = Math.sign(sin);

    x = signX * Math.pow(Math.abs(cos), 2 / n) * halfWidth;
    y = sin >= 0
      ? signY * Math.pow(Math.abs(sin), 2 / n) * topHeight
      : signY * Math.pow(Math.abs(sin), 2 / n) * bottomHeight;

    points.push(new THREE.Vector2(x, y));
  }

  return points;
}

// ─── Fuselage loft path ──────────────────────────────────────────────────────
// Station definitions along the length (z-axis, nose at +z)
// Each station: { z, halfWidth, topH, bottomH, chineSharp, offsetY }
function getFuselageStations() {
  return [
    // Nose tip
    { z: 10.0,  halfWidth: 0.0,   topH: 0.0,   bottomH: 0.0,   chineSharp: 0.8,  offsetY: 0.0   },
    // Very fine nose
    { z: 9.5,   halfWidth: 0.04,  topH: 0.02,  bottomH: 0.025, chineSharp: 0.8,  offsetY: 0.0   },
    { z: 9.0,   halfWidth: 0.10,  topH: 0.05,  bottomH: 0.06,  chineSharp: 0.7,  offsetY: 0.0   },
    { z: 8.5,   halfWidth: 0.18,  topH: 0.08,  bottomH: 0.10,  chineSharp: 0.7,  offsetY: 0.0   },
    { z: 8.0,   halfWidth: 0.28,  topH: 0.12,  bottomH: 0.15,  chineSharp: 0.65, offsetY: 0.0   },
    // Cockpit area begins
    { z: 7.5,   halfWidth: 0.40,  topH: 0.17,  bottomH: 0.20,  chineSharp: 0.6,  offsetY: 0.0   },
    { z: 7.0,   halfWidth: 0.52,  topH: 0.22,  bottomH: 0.25,  chineSharp: 0.55, offsetY: 0.0   },
    // Cockpit peak
    { z: 6.5,   halfWidth: 0.66,  topH: 0.28,  bottomH: 0.28,  chineSharp: 0.5,  offsetY: 0.01  },
    { z: 6.0,   halfWidth: 0.80,  topH: 0.30,  bottomH: 0.32,  chineSharp: 0.45, offsetY: 0.01  },
    // Body widening
    { z: 5.5,   halfWidth: 0.96,  topH: 0.32,  bottomH: 0.35,  chineSharp: 0.4,  offsetY: 0.01  },
    { z: 5.0,   halfWidth: 1.12,  topH: 0.34,  bottomH: 0.38,  chineSharp: 0.38, offsetY: 0.01  },
    { z: 4.5,   halfWidth: 1.30,  topH: 0.35,  bottomH: 0.40,  chineSharp: 0.35, offsetY: 0.01  },
    { z: 4.0,   halfWidth: 1.48,  topH: 0.36,  bottomH: 0.42,  chineSharp: 0.32, offsetY: 0.01  },
    // Max body width region + wing root blending
    { z: 3.5,   halfWidth: 1.66,  topH: 0.36,  bottomH: 0.44,  chineSharp: 0.3,  offsetY: 0.01  },
    { z: 3.0,   halfWidth: 1.84,  topH: 0.36,  bottomH: 0.44,  chineSharp: 0.28, offsetY: 0.0   },
    { z: 2.5,   halfWidth: 2.02,  topH: 0.36,  bottomH: 0.44,  chineSharp: 0.26, offsetY: 0.0   },
    { z: 2.0,   halfWidth: 2.18,  topH: 0.36,  bottomH: 0.43,  chineSharp: 0.25, offsetY: 0.0   },
    { z: 1.5,   halfWidth: 2.32,  topH: 0.35,  bottomH: 0.42,  chineSharp: 0.24, offsetY: 0.0   },
    // Wing trailing edge region
    { z: 1.0,   halfWidth: 2.40,  topH: 0.34,  bottomH: 0.40,  chineSharp: 0.24, offsetY: 0.0   },
    { z: 0.5,   halfWidth: 2.44,  topH: 0.33,  bottomH: 0.38,  chineSharp: 0.25, offsetY: 0.0   },
    { z: 0.0,   halfWidth: 2.42,  topH: 0.32,  bottomH: 0.36,  chineSharp: 0.26, offsetY: 0.0   },
    // Aft body narrowing
    { z: -0.5,  halfWidth: 2.30,  topH: 0.31,  bottomH: 0.34,  chineSharp: 0.28, offsetY: 0.0   },
    { z: -1.0,  halfWidth: 2.10,  topH: 0.30,  bottomH: 0.33,  chineSharp: 0.3,  offsetY: 0.0   },
    { z: -1.5,  halfWidth: 1.85,  topH: 0.30,  bottomH: 0.33,  chineSharp: 0.32, offsetY: 0.0   },
    { z: -2.0,  halfWidth: 1.60,  topH: 0.30,  bottomH: 0.33,  chineSharp: 0.35, offsetY: 0.0   },
    { z: -2.5,  halfWidth: 1.38,  topH: 0.30,  bottomH: 0.33,  chineSharp: 0.38, offsetY: 0.0   },
    // Engine nozzle region
    { z: -3.0,  halfWidth: 1.18,  topH: 0.30,  bottomH: 0.33,  chineSharp: 0.4,  offsetY: 0.0   },
    { z: -3.5,  halfWidth: 1.02,  topH: 0.30,  bottomH: 0.34,  chineSharp: 0.42, offsetY: 0.0   },
    // Tail
    { z: -4.0,  halfWidth: 0.88,  topH: 0.28,  bottomH: 0.32,  chineSharp: 0.45, offsetY: 0.0   },
    { z: -4.3,  halfWidth: 0.80,  topH: 0.26,  bottomH: 0.30,  chineSharp: 0.48, offsetY: 0.0   },
  ];
}

// ─── Build lofted fuselage geometry ──────────────────────────────────────────
function buildFuselageGeometry() {
  const stations = getFuselageStations();
  const circumSegments = 24;
  const vertices = [];
  const indices = [];
  const normals = [];

  // Generate cross section vertices for each station
  const rings = stations.map(st => {
    if (st.halfWidth < 0.001) {
      // Point (nose/tail tip) - create a degenerate ring
      return Array.from({ length: circumSegments + 1 }, () =>
        new THREE.Vector3(0, st.offsetY, st.z)
      );
    }
    const cs = createCrossSection(st.halfWidth, st.topH, st.bottomH, st.chineSharp);
    return cs.map(p => new THREE.Vector3(p.x, p.y + st.offsetY, st.z));
  });

  // Build vertex buffer
  for (const ring of rings) {
    for (const v of ring) {
      vertices.push(v.x, v.y, v.z);
    }
  }

  // Build index buffer (connect adjacent rings)
  const ringSize = circumSegments + 1;
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < circumSegments; j++) {
      const a = i * ringSize + j;
      const b = i * ringSize + j + 1;
      const c = (i + 1) * ringSize + j;
      const d = (i + 1) * ringSize + j + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// ─── Build wing geometry ─────────────────────────────────────────────────────
// Thin delta wings that blend into the body
function buildWingGeometry(side = 1) {
  // Wing planform (top view), side=1 for right, -1 for left
  // Leading edge sweeps back from about z=5 at body to z=-1 at tip
  // Trailing edge from z=-1 at body to z=-2 at tip
  const s = side;

  // Wing root is at ~x=1.4 (body edge), tip at x=5.0 (half wingspan ~34ft/2 scaled)
  const tipSpan = 5.0;
  const rootX = 1.3;

  const thickness = 0.06; // very thin wing
  const tipThickness = 0.02;

  // Define wing planform stations (spanwise)
  const spanStations = [
    { x: rootX,  zLE: 4.5,  zTE: -1.5, thick: thickness },
    { x: 2.0,    zLE: 3.8,  zTE: -1.8, thick: thickness * 0.85 },
    { x: 2.8,    zLE: 3.0,  zTE: -2.0, thick: thickness * 0.7 },
    { x: 3.5,    zLE: 2.2,  zTE: -2.2, thick: thickness * 0.55 },
    { x: 4.2,    zLE: 1.4,  zTE: -2.4, thick: thickness * 0.4 },
    { x: tipSpan, zLE: 0.4,  zTE: -2.6, thick: tipThickness },
  ];

  const vertices = [];
  const indices = [];

  // Each spanwise station has 4 points: LE top, LE bottom, TE top, TE bottom
  // We create an airfoil-like cross section at each station
  const chordSegments = 10;

  for (const st of spanStations) {
    const chord = st.zLE - st.zTE;
    for (let i = 0; i <= chordSegments; i++) {
      const t = i / chordSegments;
      const z = st.zLE - t * chord;

      // NACA-like thickness distribution
      const tc = 4 * t * (1 - t); // 0 at LE, peak at mid-chord, 0 at TE
      const halfT = st.thick * tc * 0.5;

      vertices.push(s * st.x, halfT, z);   // top
      vertices.push(s * st.x, -halfT, z);  // bottom
    }
  }

  const ptsPerStation = (chordSegments + 1) * 2;

  // Connect adjacent span stations
  for (let i = 0; i < spanStations.length - 1; i++) {
    for (let j = 0; j < chordSegments; j++) {
      // Top surface
      const a = i * ptsPerStation + j * 2;
      const b = (i + 1) * ptsPerStation + j * 2;
      const c = i * ptsPerStation + (j + 1) * 2;
      const d = (i + 1) * ptsPerStation + (j + 1) * 2;

      if (side === 1) {
        indices.push(a, b, c);
        indices.push(c, b, d);
      } else {
        indices.push(a, c, b);
        indices.push(c, d, b);
      }

      // Bottom surface
      const a2 = a + 1;
      const b2 = b + 1;
      const c2 = c + 1;
      const d2 = d + 1;

      if (side === 1) {
        indices.push(a2, c2, b2);
        indices.push(c2, d2, b2);
      } else {
        indices.push(a2, b2, c2);
        indices.push(c2, b2, d2);
      }
    }

    // Leading edge strip (connect top and bottom at j=0)
    const leTop = i * ptsPerStation;
    const leBot = i * ptsPerStation + 1;
    const leTopNext = (i + 1) * ptsPerStation;
    const leBotNext = (i + 1) * ptsPerStation + 1;

    indices.push(leTop, leBot, leTopNext);
    indices.push(leTopNext, leBot, leBotNext);

    // Trailing edge strip
    const teTop = i * ptsPerStation + chordSegments * 2;
    const teBot = i * ptsPerStation + chordSegments * 2 + 1;
    const teTopNext = (i + 1) * ptsPerStation + chordSegments * 2;
    const teBotNext = (i + 1) * ptsPerStation + chordSegments * 2 + 1;

    indices.push(teTop, teTopNext, teBot);
    indices.push(teTopNext, teBotNext, teBot);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// ─── Build vertical stabilizer ───────────────────────────────────────────────
function buildFinGeometry(side = 1) {
  const s = side;
  const cantAngle = side * 18 * (Math.PI / 180); // 18° outward cant

  // Fin profile (side view): root chord at z≈-2.5 to -4, tip at z≈-2.8 to -3.8
  // Height: about 1.5 units
  const rootZ1 = -2.0;  // LE root
  const rootZ2 = -4.0;  // TE root
  const tipZ1 = -2.8;   // LE tip
  const tipZ2 = -3.8;   // TE tip
  const rootY = 0.28;   // on top of fuselage
  const tipY = 1.8;     // fin tip height
  const rootX = s * 0.4; // base offset from centerline
  const thickness = 0.04;
  const tipThickness = 0.015;

  const spanSteps = 6;
  const chordSteps = 6;
  const vertices = [];
  const indices = [];

  for (let i = 0; i <= spanSteps; i++) {
    const t = i / spanSteps;
    const y = rootY + t * (tipY - rootY);
    const x = rootX + Math.sin(cantAngle) * t * (tipY - rootY);
    const zLE = rootZ1 + t * (tipZ1 - rootZ1);
    const zTE = rootZ2 + t * (tipZ2 - rootZ2);
    const thick = rootY < 0.001 ? 0 : thickness + t * (tipThickness - thickness);

    for (let j = 0; j <= chordSteps; j++) {
      const u = j / chordSteps;
      const z = zLE + u * (zTE - zLE);
      const tc = 4 * u * (1 - u);
      const halfT = thick * tc * 0.5;

      vertices.push(x + halfT, y, z);  // outer
      vertices.push(x - halfT, y, z);  // inner
    }
  }

  const ptsPerRow = (chordSteps + 1) * 2;

  for (let i = 0; i < spanSteps; i++) {
    for (let j = 0; j < chordSteps; j++) {
      const a = i * ptsPerRow + j * 2;
      const b = (i + 1) * ptsPerRow + j * 2;
      const c = i * ptsPerRow + (j + 1) * 2;
      const d = (i + 1) * ptsPerRow + (j + 1) * 2;

      indices.push(a, b, c);
      indices.push(c, b, d);

      const a2 = a + 1, b2 = b + 1, c2 = c + 1, d2 = d + 1;
      indices.push(a2, c2, b2);
      indices.push(c2, d2, b2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// ─── Build cockpit canopy ────────────────────────────────────────────────────
function buildCanopyGeometry() {
  // Small raised bubble canopy around z=7.0 to z=8.0
  const canopyLength = 1.2;
  const canopyWidth = 0.18;
  const canopyHeight = 0.12;
  const zStart = 6.8;

  const stepsZ = 8;
  const stepsArc = 12;
  const vertices = [];
  const indices = [];

  for (let i = 0; i <= stepsZ; i++) {
    const t = i / stepsZ;
    const z = zStart + t * canopyLength;
    // Canopy profile: elliptical cross-section, narrower at ends
    const profileScale = Math.sin(t * Math.PI); // 0 at edges, 1 at center
    const w = canopyWidth * profileScale;
    const h = canopyHeight * profileScale;

    // Get the fuselage top surface y at this z
    const fuselageY = getFuselageTopY(z);

    for (let j = 0; j <= stepsArc; j++) {
      const u = j / stepsArc;
      const angle = u * Math.PI; // only upper half
      const x = Math.cos(angle) * w;
      const y = fuselageY + Math.sin(angle) * h;

      vertices.push(x, y, z);
    }
  }

  const ringSize = stepsArc + 1;
  for (let i = 0; i < stepsZ; i++) {
    for (let j = 0; j < stepsArc; j++) {
      const a = i * ringSize + j;
      const b = (i + 1) * ringSize + j;
      const c = i * ringSize + j + 1;
      const d = (i + 1) * ringSize + j + 1;

      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// Helper: estimate fuselage top Y at a given Z
function getFuselageTopY(z) {
  const stations = getFuselageStations();
  for (let i = 0; i < stations.length - 1; i++) {
    if (z <= stations[i].z && z >= stations[i + 1].z) {
      const t = (stations[i].z - z) / (stations[i].z - stations[i + 1].z);
      return stations[i].topH * (1 - t) + stations[i + 1].topH * t +
             stations[i].offsetY * (1 - t) + stations[i + 1].offsetY * t;
    }
  }
  return 0;
}

// ─── Build engine nozzle geometry ────────────────────────────────────────────
function buildNozzleGeometry(side = 1) {
  const s = side;
  const nozzleX = s * 0.55;
  const zStart = -3.8;
  const zEnd = -4.6;
  const radiusStart = 0.22;
  const radiusEnd = 0.28;
  const segments = 16;
  const lengthSteps = 6;
  const vertices = [];
  const indices = [];

  for (let i = 0; i <= lengthSteps; i++) {
    const t = i / lengthSteps;
    const z = zStart + t * (zEnd - zStart);
    const r = radiusStart + t * (radiusEnd - radiusStart);

    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      const x = nozzleX + Math.cos(angle) * r;
      const y = -0.05 + Math.sin(angle) * r * 0.7; // slightly oval
      vertices.push(x, y, z);
    }
  }

  const ringSize = segments + 1;
  for (let i = 0; i < lengthSteps; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * ringSize + j;
      const b = (i + 1) * ringSize + j;
      const c = i * ringSize + j + 1;
      const d = (i + 1) * ringSize + j + 1;

      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// ─── Build intake geometry (ventral) ─────────────────────────────────────────
function buildIntakeGeometry() {
  // Ventral intake forward of the engines
  const shape = new THREE.Shape();
  shape.moveTo(-0.7, 0);
  shape.lineTo(0.7, 0);
  shape.lineTo(0.55, -0.15);
  shape.lineTo(-0.55, -0.15);
  shape.closePath();

  const extrudeSettings = {
    steps: 4,
    depth: 2.0,
    bevelEnabled: false,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.translate(0, -0.38, -2.5);
  geometry.computeVertexNormals();

  return geometry;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN BUILD FUNCTION
// ═════════════════════════════════════════════════════════════════════════════

export function buildDarkstarModel() {
  // ── Build all geometry parts ─────────────────────────────────────────────
  const fuselageGeo  = buildFuselageGeometry();
  const wingRightGeo = buildWingGeometry(1);
  const wingLeftGeo  = buildWingGeometry(-1);
  const finRightGeo  = buildFinGeometry(1);
  const finLeftGeo   = buildFinGeometry(-1);
  const canopyGeo    = buildCanopyGeometry();
  const nozzleRGeo   = buildNozzleGeometry(1);
  const nozzleLGeo   = buildNozzleGeometry(-1);
  const intakeGeo    = buildIntakeGeometry();

  // ── Wireframe materials ──────────────────────────────────────────────────
  const wfColor = new THREE.Color(0x00d4ff);
  const wfMat = new THREE.MeshBasicMaterial({
    color: wfColor,
    wireframe: true,
    transparent: true,
    opacity: 0.65,
  });
  const wfMatBright = new THREE.MeshBasicMaterial({
    color: 0x00eeff,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
  });
  const wfMatDim = new THREE.MeshBasicMaterial({
    color: 0x0088aa,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });
  const wfCanopyMat = new THREE.MeshBasicMaterial({
    color: 0x40c8ff,
    wireframe: true,
    transparent: true,
    opacity: 0.9,
  });

  // ── Shaded materials ────────────────────────────────────────────────────
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1c32,
    metalness: 0.85,
    roughness: 0.3,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.5,
  });
  const wingMat = new THREE.MeshPhysicalMaterial({
    color: 0x081828,
    metalness: 0.9,
    roughness: 0.25,
    clearcoat: 0.3,
  });
  const finMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c2238,
    metalness: 0.85,
    roughness: 0.3,
    clearcoat: 0.5,
  });
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x1080c0,
    metalness: 0.2,
    roughness: 0.05,
    transmission: 0.6,
    thickness: 0.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    ior: 1.5,
    transparent: true,
    opacity: 0.85,
  });
  const nozzleMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a1a,
    metalness: 0.95,
    roughness: 0.5,
    emissive: 0x331100,
    emissiveIntensity: 0.3,
  });
  const intakeMat = new THREE.MeshPhysicalMaterial({
    color: 0x040810,
    metalness: 0.7,
    roughness: 0.6,
  });

  // ── Assemble wireframe group ────────────────────────────────────────────
  const wireframeGroup = new THREE.Group();
  wireframeGroup.add(new THREE.Mesh(fuselageGeo, wfMat));
  wireframeGroup.add(new THREE.Mesh(wingRightGeo, wfMat));
  wireframeGroup.add(new THREE.Mesh(wingLeftGeo, wfMat));
  wireframeGroup.add(new THREE.Mesh(finRightGeo, wfMatBright));
  wireframeGroup.add(new THREE.Mesh(finLeftGeo, wfMatBright));
  wireframeGroup.add(new THREE.Mesh(canopyGeo, wfCanopyMat));
  wireframeGroup.add(new THREE.Mesh(nozzleRGeo, wfMatDim));
  wireframeGroup.add(new THREE.Mesh(nozzleLGeo, wfMatDim));
  wireframeGroup.add(new THREE.Mesh(intakeGeo, wfMatDim));

  // ── Edge highlights for wireframe mode ──────────────────────────────────
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.22 });
  [fuselageGeo, wingRightGeo, wingLeftGeo].forEach(geo => {
    const edges = new THREE.EdgesGeometry(geo, 25);
    wireframeGroup.add(new THREE.LineSegments(edges, edgeMat));
  });

  // ── Assemble shaded group ──────────────────────────────────────────────
  const shadedGroup = new THREE.Group();
  shadedGroup.add(new THREE.Mesh(fuselageGeo, bodyMat));
  shadedGroup.add(new THREE.Mesh(wingRightGeo, wingMat));
  shadedGroup.add(new THREE.Mesh(wingLeftGeo, wingMat));
  shadedGroup.add(new THREE.Mesh(finRightGeo, finMat));
  shadedGroup.add(new THREE.Mesh(finLeftGeo, finMat));
  shadedGroup.add(new THREE.Mesh(canopyGeo, canopyMat));
  shadedGroup.add(new THREE.Mesh(nozzleRGeo, nozzleMat));
  shadedGroup.add(new THREE.Mesh(nozzleLGeo, nozzleMat));
  shadedGroup.add(new THREE.Mesh(intakeGeo, intakeMat));

  // Subtle edge highlight lines on shaded model
  const shadedEdgeMat = new THREE.LineBasicMaterial({ color: 0x2080b0, transparent: true, opacity: 0.08 });
  const fuselageEdges = new THREE.EdgesGeometry(fuselageGeo, 15);
  shadedGroup.add(new THREE.LineSegments(fuselageEdges, shadedEdgeMat));

  // ── Combined container ──────────────────────────────────────────────────
  const allGroups = new THREE.Group();
  allGroups.add(wireframeGroup);
  allGroups.add(shadedGroup);

  return { wireframeGroup, shadedGroup, allGroups };
}

// ─── Grid helpers for blueprint mode ─────────────────────────────────────────
export function createBlueprintGrid() {
  const gridGroup = new THREE.Group();

  // Main grid
  const gridHelper = new THREE.GridHelper(30, 30, 0x002244, 0x001122);
  gridHelper.position.y = -0.8;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.35;
  gridGroup.add(gridHelper);

  // Fine grid overlay
  const fineGrid = new THREE.GridHelper(30, 120, 0x001133, 0x000a1a);
  fineGrid.position.y = -0.79;
  fineGrid.material.transparent = true;
  fineGrid.material.opacity = 0.15;
  gridGroup.add(fineGrid);

  return gridGroup;
}

// ─── Engine exhaust effect geometry ──────────────────────────────────────────
export function createExhaustCones() {
  const group = new THREE.Group();

  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });

  const coneGeo = new THREE.ConeGeometry(0.3, 2.5, 12, 1, true);
  coneGeo.rotateX(Math.PI / 2);

  [-1, 1].forEach(side => {
    const cone = new THREE.Mesh(coneGeo, coneMat.clone());
    cone.position.set(side * 0.55, -0.05, -5.8);
    group.add(cone);
  });

  return group;
}
