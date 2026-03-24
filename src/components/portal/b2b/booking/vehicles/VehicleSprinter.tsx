import * as THREE from 'three';
import {
  DetailWheel, Headlight, Taillight, SideMirror, SwingDoor, SlidingDoor,
  GlassPanel, Grille, WheelArch, BodyPanel,
  PAINT_VEHICLE_LIGHT, PAINT_DARK, CHROME, BUMPER_PLASTIC,
  type VehicleModelProps,
} from './shared';

const S = 0.01;

export function VehicleSprinter({ lengthCm, widthCm, heightCm, doors }: VehicleModelProps) {
  const L = lengthCm * S;
  const W = widthCm * S;
  const H = heightCm * S;

  const cabinL = L * 0.22;
  const cargoL = L * 0.78;
  const totalL = L;
  const chassisH = 0.14;
  const bodyH = H * 0.88;
  const wheelR = 0.28;
  const wheelW = 0.16;

  const cargoStartX = -totalL / 2;
  const cargoCenterX = cargoStartX + cargoL / 2;
  const cabinCenterX = cargoStartX + cargoL + cabinL / 2;

  return (
    <group>
      {/* ── Chassis ── */}
      <BodyPanel position={[0, chassisH / 2, 0]} size={[totalL + 0.05, chassisH, W + 0.04]} material={PAINT_DARK} radius={0.02} />

      {/* ── Cabin ── */}
      <group position={[cabinCenterX, 0, 0]}>
        <BodyPanel position={[0, chassisH + bodyH / 2, 0]} size={[cabinL, bodyH, W + 0.02]} material={PAINT_VEHICLE_LIGHT} radius={0.05} />
        <BodyPanel position={[0, chassisH + bodyH + 0.02, 0]} size={[cabinL - 0.02, 0.04, W]} material={PAINT_VEHICLE_LIGHT} radius={0.02} />
        <BodyPanel position={[cabinL * 0.3, chassisH + bodyH * 0.32, 0]} size={[cabinL * 0.4, 0.035, W - 0.05]} material={PAINT_VEHICLE_LIGHT} radius={0.015} rotation={[0, 0, 0.18]} />

        {/* Mercedes star */}
        <mesh position={[cabinL / 2 + 0.025, chassisH + bodyH * 0.5, 0]}>
          <circleGeometry args={[0.05, 3]} />
          <meshPhysicalMaterial {...CHROME} side={2} />
        </mesh>

        <Grille position={[cabinL / 2 + 0.02, chassisH + bodyH * 0.25, 0]} size={[W * 0.55, bodyH * 0.22]} slats={6} />
        <GlassPanel position={[cabinL / 2 + 0.012, chassisH + bodyH * 0.68, 0]} size={[bodyH * 0.5, W * 0.88]} rotation={[0, Math.PI / 2, 0.1]} />
        <GlassPanel position={[0, chassisH + bodyH * 0.68, W / 2 + 0.015]} size={[cabinL * 0.55, bodyH * 0.38]} />
        <GlassPanel position={[0, chassisH + bodyH * 0.68, -W / 2 - 0.015]} size={[cabinL * 0.55, bodyH * 0.38]} />

        <Headlight position={[cabinL / 2 + 0.02, chassisH + bodyH * 0.38, W * 0.36]} size={[0.12, 0.06, 0.06]} />
        <Headlight position={[cabinL / 2 + 0.02, chassisH + bodyH * 0.38, -W * 0.36]} size={[0.12, 0.06, 0.06]} />

        <SideMirror position={[cabinL * 0.28, chassisH + bodyH * 0.75, W / 2 + 0.01]} side="left" />
        <SideMirror position={[cabinL * 0.28, chassisH + bodyH * 0.75, -W / 2 - 0.01]} side="right" />

        <BodyPanel position={[cabinL / 2 + 0.03, chassisH + 0.07, 0]} size={[0.06, 0.14, W + 0.04]} material={BUMPER_PLASTIC} radius={0.02} />

        {/* Wheel arches */}
        <WheelArch position={[cabinL * 0.15, chassisH + 0.05, W / 2 + 0.015]} radius={wheelR + 0.05} width={0.04} />
        <WheelArch position={[cabinL * 0.15, chassisH + 0.05, -W / 2 - 0.015]} radius={wheelR + 0.05} width={0.04} />
      </group>

      {/* ── Cargo Area ── */}
      <group position={[cargoCenterX, 0, 0]}>
        <mesh position={[0, chassisH, 0]} receiveShadow>
          <boxGeometry args={[cargoL, 0.025, W]} />
          <meshPhysicalMaterial color="#3a3a44" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, chassisH + H / 2, W / 2]}>
          <boxGeometry args={[cargoL, H, 0.02]} />
          <meshPhysicalMaterial {...PAINT_VEHICLE_LIGHT} transparent opacity={0.12} />
        </mesh>
        {!doors.side && (
          <mesh position={[0, chassisH + H / 2, -W / 2]}>
            <boxGeometry args={[cargoL, H, 0.02]} />
            <meshPhysicalMaterial {...PAINT_VEHICLE_LIGHT} transparent opacity={0.12} />
          </mesh>
        )}
        <mesh position={[0, chassisH + H, 0]}>
          <boxGeometry args={[cargoL, 0.02, W]} />
          <meshPhysicalMaterial {...PAINT_VEHICLE_LIGHT} transparent opacity={0.08} />
        </mesh>
        <mesh position={[cargoL / 2, chassisH + H / 2, 0]}>
          <boxGeometry args={[0.025, H, W]} />
          <meshPhysicalMaterial {...PAINT_DARK} />
        </mesh>
        <lineSegments position={[0, chassisH + H / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(cargoL, H, W)]} />
          <lineBasicMaterial color="#4466aa" transparent opacity={0.15} />
        </lineSegments>

        <WheelArch position={[cargoL * 0.15 - cargoL / 2, chassisH + 0.05, W / 2 + 0.015]} radius={wheelR + 0.05} width={0.04} />
        <WheelArch position={[cargoL * 0.15 - cargoL / 2, chassisH + 0.05, -W / 2 - 0.015]} radius={wheelR + 0.05} width={0.04} />
      </group>

      {/* ── Doors ── */}
      <SlidingDoor
        position={[cargoCenterX, chassisH + H / 2, -W / 2 - 0.005]}
        size={[cargoL * 0.5, H * 0.88, 0.025]}
        isOpen={doors.side}
        slideDistance={-cargoL * 0.48}
        slideAxis="x"
        material={PAINT_VEHICLE_LIGHT}
      />
      <SwingDoor
        position={[cargoStartX - 0.01, chassisH + H / 2, W / 4]}
        size={[0.025, H * 0.92, W / 2 - 0.02]}
        pivotOffset={[0, 0, W / 4 - 0.01]}
        isOpen={doors.rear}
        openAngle={Math.PI * 0.5}
        direction={1}
        material={PAINT_VEHICLE_LIGHT}
      />
      <SwingDoor
        position={[cargoStartX - 0.01, chassisH + H / 2, -W / 4]}
        size={[0.025, H * 0.92, W / 2 - 0.02]}
        pivotOffset={[0, 0, -(W / 4 - 0.01)]}
        isOpen={doors.rear}
        openAngle={Math.PI * 0.5}
        direction={-1}
        material={PAINT_VEHICLE_LIGHT}
      />

      <Taillight position={[cargoStartX - 0.015, chassisH + H * 0.35, W / 2 - 0.05]} size={[0.03, 0.12, 0.05]} />
      <Taillight position={[cargoStartX - 0.015, chassisH + H * 0.35, -W / 2 + 0.05]} size={[0.03, 0.12, 0.05]} />
      <BodyPanel position={[cargoStartX - 0.025, chassisH + 0.05, 0]} size={[0.05, 0.1, W + 0.02]} material={BUMPER_PLASTIC} radius={0.015} />

      {/* ── Wheels ── */}
      <DetailWheel position={[cabinCenterX + cabinL * 0.15, wheelR, W / 2 + wheelW / 2 + 0.02]} radius={wheelR} width={wheelW} />
      <DetailWheel position={[cabinCenterX + cabinL * 0.15, wheelR, -W / 2 - wheelW / 2 - 0.02]} radius={wheelR} width={wheelW} />
      <DetailWheel position={[cargoStartX + cargoL * 0.15, wheelR, W / 2 + wheelW / 2 + 0.02]} radius={wheelR} width={wheelW} />
      <DetailWheel position={[cargoStartX + cargoL * 0.15, wheelR, -W / 2 - wheelW / 2 - 0.02]} radius={wheelR} width={wheelW} />
    </group>
  );
}
