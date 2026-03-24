import * as THREE from 'three';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import {
  type VehicleModelProps,
  DetailWheel,
  Headlight,
  Taillight,
  SideMirror,
  SwingDoor,
  SlidingDoor,
  BodyPanel,
  Grille,
  PAINT_INDIUM_GREY,
  BLACK_CLADDING,
  CHROME,
  GLASS_PHYSICAL,
  BUMPER_PLASTIC,
} from './shared';

const S = 0.01;

/* ─── VW Caddy Cargo Maxi 2025 — Ultra-Premium Pure 3D ─── */
export function VehicleCaddy({ lengthCm, widthCm, heightCm, doors }: VehicleModelProps) {
  const L = lengthCm * S;
  const W = widthCm * S;
  const H = heightCm * S;

  // ── Overall vehicle envelope ──
  const totalL = L * 1.55;   // full bumper-to-bumper
  const totalH = H * 1.25;   // roof height incl chassis
  const chassisH = 0.10;     // ground clearance

  // ── Proportional zones ──
  const hoodL = totalL * 0.30;       // short Caddy hood
  const cabinL = totalL * 0.22;      // cabin length
  const cargoL = L;                   // cargo bay = user dimension
  const rearOverhang = totalL - hoodL - cabinL - cargoL;

  // ── Key X positions (front = +X) ──
  const frontX = totalL / 2;
  const hoodEnd = frontX - hoodL;
  const cabinEnd = hoodEnd - cabinL;
  const cargoEnd = cabinEnd - cargoL;

  // ── Wheels ──
  const wheelRadius = totalH * 0.18;
  const wheelWidth = 0.06;
  const frontWheelX = frontX - hoodL * 0.75;
  const rearWheelX = cargoEnd + cargoL * 0.15;
  const wheelZ = W / 2 + 0.025;
  const wheelY = wheelRadius * 0.9;

  // ── Heights ──
  const beltLineH = chassisH + totalH * 0.42;  // window bottom line
  const roofH = chassisH + totalH;              // roof top
  const hoodH = chassisH + totalH * 0.40;       // hood surface
  const claddingH = chassisH + totalH * 0.18;   // black lower trim

  // ── Body silhouette (side profile extruded to width) ──
  const bodyGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const hL = totalL / 2;
    const bH = chassisH;
    const topH = roofH;
    const windshieldBase = hoodEnd;
    const windshieldTop = hoodEnd + cabinL * 0.15; // ~65° angle

    // Front bumper bottom
    shape.moveTo(hL, bH + 0.015);
    // Front bumper face (rounded)
    shape.quadraticCurveTo(hL + 0.025, bH + 0.015, hL + 0.025, bH + 0.06);
    shape.lineTo(hL + 0.02, hoodH - 0.02);
    // Front grille top edge
    shape.quadraticCurveTo(hL + 0.02, hoodH + 0.01, hL - 0.01, hoodH + 0.015);
    // Hood — slight upward slope toward windshield
    shape.lineTo(windshieldBase + 0.02, hoodH + 0.025);
    // Windshield — ~65° from horizontal (angled, not vertical)
    shape.quadraticCurveTo(
      windshieldBase - 0.01, (hoodH + topH) * 0.55,
      windshieldTop, topH - 0.015
    );
    // Roof front edge
    shape.lineTo(windshieldTop - 0.02, topH);
    // Roof — long flat with gentle crown
    const roofMidX = (windshieldTop + cargoEnd) / 2;
    shape.quadraticCurveTo(roofMidX, topH + 0.012, cargoEnd + 0.02, topH - 0.005);
    // Rear roof drop
    shape.quadraticCurveTo(cargoEnd - 0.02, topH - 0.01, -hL + 0.02, topH * 0.88);
    // Rear face — near vertical with slight inward taper
    shape.lineTo(-hL + 0.01, topH * 0.85);
    shape.lineTo(-hL - 0.005, bH + 0.06);
    // Rear bumper
    shape.quadraticCurveTo(-hL - 0.005, bH + 0.015, -hL + 0.03, bH + 0.015);
    // Bottom — with wheel arches
    shape.lineTo(rearWheelX + wheelRadius * 1.2, bH + 0.015);
    // Rear wheel arch
    shape.arc(0, 0, wheelRadius * 0.05, 0, Math.PI, true);
    shape.quadraticCurveTo(rearWheelX, bH - 0.005, rearWheelX - wheelRadius * 1.2, bH + 0.015);
    shape.lineTo(frontWheelX + wheelRadius * 1.2, bH + 0.015);
    // Front wheel arch
    shape.quadraticCurveTo(frontWheelX, bH - 0.005, frontWheelX - wheelRadius * 1.2, bH + 0.015);
    shape.lineTo(hL, bH + 0.015);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: W * 0.85,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 5,
      curveSegments: 24,
    });
    geo.center();
    return geo;
  }, [totalL, totalH, chassisH, W, roofH, hoodH, hoodEnd, cabinL, cargoEnd, wheelRadius, frontWheelX, rearWheelX]);

  return (
    <group>
      {/* ═══════════════════════════════════════════
          MAIN BODY SHELL — Indium Grey clearcoat
          ═══════════════════════════════════════════ */}
      <mesh geometry={bodyGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          {...PAINT_INDIUM_GREY}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ═══ HOOD PANEL — separate for character line ═══ */}
      <BodyPanel
        position={[(frontX + hoodEnd) / 2, hoodH + 0.02, 0]}
        size={[hoodL - 0.04, 0.012, W - 0.06]}
        material={PAINT_INDIUM_GREY}
        radius={0.01}
      />
      {/* Hood character line — subtle ridge */}
      <mesh position={[(frontX + hoodEnd) / 2, hoodH + 0.028, 0]} castShadow>
        <boxGeometry args={[hoodL * 0.7, 0.003, 0.003]} />
        <meshPhysicalMaterial {...CHROME} color="#888" />
      </mesh>

      {/* ═══ BLACK LOWER CLADDING — VW Caddy signature ═══ */}
      {/* Left side cladding */}
      <BodyPanel
        position={[0, (chassisH + claddingH) / 2, W / 2 - 0.005]}
        size={[totalL * 0.85, claddingH - chassisH, 0.018]}
        material={BLACK_CLADDING}
        radius={0.006}
      />
      {/* Right side cladding */}
      <BodyPanel
        position={[0, (chassisH + claddingH) / 2, -(W / 2 - 0.005)]}
        size={[totalL * 0.85, claddingH - chassisH, 0.018]}
        material={BLACK_CLADDING}
        radius={0.006}
      />

      {/* ═══ WHEEL ARCH CLADDING — black flares ═══ */}
      {[frontWheelX, rearWheelX].map((wx, i) =>
        [-1, 1].map((side) => (
          <mesh
            key={`arch-${i}-${side}`}
            position={[wx, wheelY + wheelRadius * 0.3, side * wheelZ * 0.85]}
            rotation={[0, 0, 0]}
          >
            <torusGeometry args={[wheelRadius * 1.05, 0.022, 8, 16, Math.PI]} />
            <meshPhysicalMaterial {...BLACK_CLADDING} />
          </mesh>
        ))
      )}

      {/* ═══ FRONT FACE — VW grille + headlights ═══ */}
      {/* Grille surround */}
      <BodyPanel
        position={[frontX + 0.01, (hoodH + chassisH + 0.06) / 2, 0]}
        size={[0.025, hoodH - chassisH - 0.04, W * 0.7]}
        material={BUMPER_PLASTIC}
        radius={0.008}
      />
      {/* Chrome grille bar — VW signature */}
      <mesh position={[frontX + 0.02, hoodH * 0.72, 0]} castShadow>
        <boxGeometry args={[0.008, 0.012, W * 0.55]} />
        <meshPhysicalMaterial {...CHROME} />
      </mesh>
      {/* Secondary grille slats */}
      <Grille
        position={[frontX + 0.015, hoodH * 0.55, 0]}
        size={[W * 0.5, hoodH * 0.25]}
        slats={4}
      />

      {/* VW Badge (center of grille) */}
      <mesh position={[frontX + 0.025, hoodH * 0.72, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.006, 20]} />
        <meshPhysicalMaterial {...CHROME} />
      </mesh>
      <mesh position={[frontX + 0.029, hoodH * 0.72, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.003, 20]} />
        <meshPhysicalMaterial color="#1a3a6a" roughness={0.3} metalness={0.5} clearcoat={1} />
      </mesh>

      {/* ═══ LED HEADLIGHTS — with DRL strips ═══ */}
      <Headlight
        position={[frontX + 0.005, hoodH * 0.68, W * 0.28]}
        size={[0.10, 0.055, 0.06]}
      />
      <Headlight
        position={[frontX + 0.005, hoodH * 0.68, -W * 0.28]}
        size={[0.10, 0.055, 0.06]}
      />

      {/* ═══ FRONT BUMPER — lower section ═══ */}
      <BodyPanel
        position={[frontX + 0.015, chassisH + 0.03, 0]}
        size={[0.035, 0.05, W + 0.02]}
        material={BUMPER_PLASTIC}
        radius={0.01}
      />
      {/* Fog light recesses */}
      {[-1, 1].map((s) => (
        <mesh key={`fog-${s}`} position={[frontX + 0.02, chassisH + 0.04, s * W * 0.32]}>
          <boxGeometry args={[0.015, 0.025, 0.04]} />
          <meshPhysicalMaterial color="#111" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}

      {/* ═══ WINDSHIELD — ~65° angled glass ═══ */}
      <mesh
        position={[hoodEnd + cabinL * 0.08, (hoodH + roofH) / 2 + 0.02, 0]}
        rotation={[0, 0, Math.PI * 0.14]}
        castShadow
      >
        <planeGeometry args={[totalH * 0.45, W - 0.06]} />
        <meshPhysicalMaterial {...GLASS_PHYSICAL} />
      </mesh>

      {/* ═══ REAR WINDOW — slightly raked ═══ */}
      <mesh
        position={[-totalL / 2 + 0.02, roofH * 0.82, 0]}
        rotation={[0, 0, -Math.PI * 0.06]}
      >
        <planeGeometry args={[totalH * 0.28, W - 0.08]} />
        <meshPhysicalMaterial {...GLASS_PHYSICAL} opacity={0.25} />
      </mesh>

      {/* ═══ A-PILLARS — structural ═══ */}
      {[-1, 1].map((s) => (
        <mesh
          key={`a-pillar-${s}`}
          position={[hoodEnd + cabinL * 0.06, (hoodH + roofH) / 2 + 0.02, s * (W / 2 - 0.02)]}
          rotation={[0, 0, Math.PI * 0.14]}
        >
          <boxGeometry args={[totalH * 0.44, 0.025, 0.025]} />
          <meshPhysicalMaterial {...PAINT_INDIUM_GREY} />
        </mesh>
      ))}

      {/* ═══ SIDE CABIN WINDOWS — tinted ═══ */}
      {[-1, 1].map((s) => (
        <mesh
          key={`cabin-window-${s}`}
          position={[(hoodEnd + cabinEnd) / 2, (beltLineH + roofH) / 2, s * (W / 2 + 0.005)]}
        >
          <planeGeometry args={[cabinL * 0.7, (roofH - beltLineH) * 0.7]} />
          <meshPhysicalMaterial
            {...GLASS_PHYSICAL}
            color="#4477aa"
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* ═══ B-PILLAR — between cabin and cargo ═══ */}
      {[-1, 1].map((s) => (
        <mesh
          key={`b-pillar-${s}`}
          position={[cabinEnd, (beltLineH + roofH) / 2, s * (W / 2 - 0.005)]}
        >
          <boxGeometry args={[0.025, roofH - beltLineH, 0.02]} />
          <meshPhysicalMaterial {...PAINT_INDIUM_GREY} />
        </mesh>
      ))}

      {/* ═══ ROOF RAILS — anodized aluminium ═══ */}
      {[-1, 1].map((s) => (
        <mesh
          key={`roof-rail-${s}`}
          position={[cabinEnd / 2, roofH + 0.01, s * (W / 2 - 0.04)]}
          castShadow
        >
          <boxGeometry args={[totalL * 0.55, 0.012, 0.018]} />
          <meshPhysicalMaterial color="#888" roughness={0.3} metalness={0.7} clearcoat={0.6} />
        </mesh>
      ))}

      {/* ═══ SIDE MIRRORS — premium ═══ */}
      <SideMirror position={[hoodEnd + 0.02, beltLineH + 0.04, W / 2]} side="left" />
      <SideMirror position={[hoodEnd + 0.02, beltLineH + 0.04, -W / 2]} side="right" />

      {/* ═══ REAR FACE ═══ */}
      {/* Rear panel */}
      <BodyPanel
        position={[-totalL / 2 - 0.005, (chassisH + roofH * 0.85) / 2, 0]}
        size={[0.02, roofH * 0.85 - chassisH, W - 0.02]}
        material={PAINT_INDIUM_GREY}
        radius={0.008}
      />

      {/* ═══ TAILLIGHTS — LED glow ═══ */}
      <Taillight position={[-totalL / 2 + 0.01, roofH * 0.6, W / 2 - 0.04]} size={[0.035, 0.10, 0.05]} />
      <Taillight position={[-totalL / 2 + 0.01, roofH * 0.6, -(W / 2 - 0.04)]} size={[0.035, 0.10, 0.05]} />

      {/* Rear bumper */}
      <BodyPanel
        position={[-totalL / 2 - 0.005, chassisH + 0.03, 0]}
        size={[0.035, 0.055, W + 0.01]}
        material={BUMPER_PLASTIC}
        radius={0.01}
      />

      {/* License plate area */}
      <mesh position={[-totalL / 2 - 0.008, chassisH + totalH * 0.28, 0]}>
        <boxGeometry args={[0.004, 0.04, 0.14]} />
        <meshPhysicalMaterial color="#f5f5ee" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Rear VW badge */}
      <mesh position={[-totalL / 2 - 0.01, roofH * 0.72, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.005, 20]} />
        <meshPhysicalMaterial {...CHROME} />
      </mesh>

      {/* ═══ WHEELS — premium alloy ═══ */}
      <DetailWheel position={[frontWheelX, wheelY, wheelZ]} radius={wheelRadius} width={wheelWidth} />
      <DetailWheel position={[frontWheelX, wheelY, -wheelZ]} radius={wheelRadius} width={wheelWidth} />
      <DetailWheel position={[rearWheelX, wheelY, wheelZ]} radius={wheelRadius} width={wheelWidth} />
      <DetailWheel position={[rearWheelX, wheelY, -wheelZ]} radius={wheelRadius} width={wheelWidth} />

      {/* ═══ CARGO INTERIOR — semi-transparent for load visibility ═══ */}
      <group position={[cabinEnd - cargoL / 2, 0, 0]}>
        {/* Floor */}
        <mesh position={[0, chassisH + 0.005, 0]} receiveShadow>
          <boxGeometry args={[cargoL - 0.02, 0.015, W - 0.04]} />
          <meshPhysicalMaterial color="#2a2a30" roughness={0.6} metalness={0.4} />
        </mesh>

        {/* Front wall (cabin separation) */}
        <mesh position={[cargoL / 2 - 0.005, chassisH + H / 2, 0]}>
          <boxGeometry args={[0.015, H - 0.02, W - 0.02]} />
          <meshPhysicalMaterial color="#3a3a42" roughness={0.5} metalness={0.3} transparent opacity={0.25} />
        </mesh>

        {/* Rear doors — two swing doors */}
        <SwingDoor
          position={[-cargoL / 2 + 0.005, chassisH + H / 2, W / 4 - 0.005]}
          size={[0.015, H - 0.02, W / 2 - 0.02]}
          pivotOffset={[0, 0, -(W / 4 - 0.01)]}
          isOpen={doors.rear}
          openAngle={Math.PI * 0.55}
          direction={-1}
          material={PAINT_INDIUM_GREY}
        />
        <SwingDoor
          position={[-cargoL / 2 + 0.005, chassisH + H / 2, -(W / 4 - 0.005)]}
          size={[0.015, H - 0.02, W / 2 - 0.02]}
          pivotOffset={[0, 0, W / 4 - 0.01]}
          isOpen={doors.rear}
          openAngle={Math.PI * 0.55}
          direction={1}
          material={PAINT_INDIUM_GREY}
        />

        {/* Left side wall — fixed */}
        <mesh position={[0, chassisH + H / 2, W / 2 - 0.008]}>
          <boxGeometry args={[cargoL - 0.02, H - 0.02, 0.01]} />
          <meshPhysicalMaterial color="#3a3a42" roughness={0.5} metalness={0.3} transparent opacity={0.08} />
        </mesh>

        {/* Right side — sliding door */}
        <SlidingDoor
          position={[0, chassisH + H / 2, -(W / 2 - 0.008)]}
          size={[cargoL * 0.55, H - 0.02, 0.015]}
          isOpen={doors.side}
          slideDistance={-cargoL * 0.5}
          slideAxis="x"
          material={PAINT_INDIUM_GREY}
        />

        {/* Ceiling */}
        <mesh position={[0, chassisH + H - 0.005, 0]}>
          <boxGeometry args={[cargoL - 0.02, 0.01, W - 0.04]} />
          <meshPhysicalMaterial color="#3a3a42" roughness={0.5} metalness={0.3} transparent opacity={0.1} />
        </mesh>

        {/* Interior wireframe */}
        <lineSegments position={[0, chassisH + H / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(cargoL - 0.02, H - 0.02, W - 0.02)]} />
          <lineBasicMaterial color="#4466aa" transparent opacity={0.12} />
        </lineSegments>
      </group>

      {/* ═══ GROUND SHADOW ═══ */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[totalL + 0.2, W + 0.4]} />
        <shadowMaterial opacity={0.18} />
      </mesh>
    </group>
  );
}
