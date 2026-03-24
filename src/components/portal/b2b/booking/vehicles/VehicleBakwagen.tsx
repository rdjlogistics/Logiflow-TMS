import * as THREE from 'three';
import {
  DetailWheel, Headlight, Taillight, SideMirror, SwingDoor, TailLift,
  GlassPanel, Grille, WheelArch, BodyPanel,
  PAINT_VEHICLE_LIGHT, PAINT_DARK, CHROME, ALUMINIUM, BUMPER_PLASTIC,
  type VehicleModelProps,
} from './shared';

const S = 0.01;

export function VehicleBakwagen({ lengthCm, widthCm, heightCm, doors, hasTailLift = false }: VehicleModelProps & { hasTailLift?: boolean }) {
  const L = lengthCm * S;
  const W = widthCm * S;
  const H = heightCm * S;

  const cabinL = L * 0.2;
  const boxL = L * 0.8;
  const totalL = L;
  const chassisH = 0.16;
  const cabinH = H * 0.7;
  const wheelR = 0.3;
  const wheelW = 0.18;

  const boxStartX = -totalL / 2;
  const boxCenterX = boxStartX + boxL / 2;
  const cabinCenterX = boxStartX + boxL + cabinL / 2;

  return (
    <group>
      {/* ── Chassis ── */}
      <BodyPanel position={[0, chassisH / 2, 0]} size={[totalL + 0.06, chassisH, W + 0.06]} material={PAINT_DARK} radius={0.02} />
      {[-1, 1].map((s) => (
        <mesh key={`rail-${s}`} position={[0, chassisH * 0.7, s * (W / 2 - 0.05)]}>
          <boxGeometry args={[totalL, chassisH * 0.3, 0.04]} />
          <meshPhysicalMaterial color="#141418" roughness={0.5} metalness={0.7} />
        </mesh>
      ))}

      {/* ── Cabin ── */}
      <group position={[cabinCenterX, 0, 0]}>
        <BodyPanel position={[0, chassisH + cabinH / 2, 0]} size={[cabinL, cabinH, W + 0.02]} material={PAINT_VEHICLE_LIGHT} radius={0.05} />
        <BodyPanel position={[0, chassisH + cabinH + 0.02, 0]} size={[cabinL - 0.02, 0.04, W]} material={PAINT_VEHICLE_LIGHT} radius={0.02} />
        <BodyPanel position={[cabinL * 0.3, chassisH + cabinH * 0.3, 0]} size={[cabinL * 0.4, 0.03, W - 0.06]} material={PAINT_VEHICLE_LIGHT} radius={0.012} rotation={[0, 0, 0.2]} />

        <Grille position={[cabinL / 2 + 0.02, chassisH + cabinH * 0.22, 0]} size={[W * 0.5, cabinH * 0.2]} slats={5} />
        <GlassPanel position={[cabinL / 2 + 0.012, chassisH + cabinH * 0.65, 0]} size={[cabinH * 0.5, W * 0.85]} rotation={[0, Math.PI / 2, 0.1]} />
        <GlassPanel position={[0, chassisH + cabinH * 0.65, W / 2 + 0.015]} size={[cabinL * 0.55, cabinH * 0.35]} />
        <GlassPanel position={[0, chassisH + cabinH * 0.65, -W / 2 - 0.015]} size={[cabinL * 0.55, cabinH * 0.35]} />

        <Headlight position={[cabinL / 2 + 0.02, chassisH + cabinH * 0.35, W * 0.35]} size={[0.1, 0.05, 0.06]} />
        <Headlight position={[cabinL / 2 + 0.02, chassisH + cabinH * 0.35, -W * 0.35]} size={[0.1, 0.05, 0.06]} />

        <SideMirror position={[cabinL * 0.28, chassisH + cabinH * 0.72, W / 2 + 0.01]} side="left" />
        <SideMirror position={[cabinL * 0.28, chassisH + cabinH * 0.72, -W / 2 - 0.01]} side="right" />

        <BodyPanel position={[cabinL / 2 + 0.03, chassisH + 0.07, 0]} size={[0.06, 0.14, W + 0.04]} material={BUMPER_PLASTIC} radius={0.02} />

        <mesh position={[cabinL / 2 + 0.028, chassisH + cabinH * 0.48, 0]}>
          <circleGeometry args={[0.04, 3]} />
          <meshPhysicalMaterial {...CHROME} side={2} />
        </mesh>

        <WheelArch position={[cabinL * 0.15, chassisH + 0.05, W / 2 + 0.015]} radius={wheelR + 0.05} width={0.04} />
        <WheelArch position={[cabinL * 0.15, chassisH + 0.05, -W / 2 - 0.015]} radius={wheelR + 0.05} width={0.04} />
      </group>

      {/* ── Cargo Box (aluminium) ── */}
      <group position={[boxCenterX, 0, 0]}>
        <mesh position={[0, chassisH, 0]} receiveShadow>
          <boxGeometry args={[boxL, 0.035, W + 0.02]} />
          <meshPhysicalMaterial {...ALUMINIUM} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={`w-${s}`} position={[0, chassisH + H / 2, s * (W / 2 + 0.01)]}>
            <boxGeometry args={[boxL, H, 0.03]} />
            <meshPhysicalMaterial {...ALUMINIUM} transparent opacity={0.2} />
          </mesh>
        ))}
        <mesh position={[0, chassisH + H + 0.015, 0]}>
          <boxGeometry args={[boxL, 0.03, W + 0.02]} />
          <meshPhysicalMaterial {...ALUMINIUM} transparent opacity={0.15} />
        </mesh>
        <mesh position={[boxL / 2, chassisH + H / 2, 0]}>
          <boxGeometry args={[0.03, H, W]} />
          <meshPhysicalMaterial {...ALUMINIUM} />
        </mesh>

        {/* Ribs */}
        {Array.from({ length: 4 }).map((_, i) => (
          [-1, 1].map((s) => (
            <mesh key={`rib-${i}-${s}`} position={[boxL / 2 - boxL * 0.2 * (i + 1), chassisH + H / 2, s * (W / 2 + 0.025)]}>
              <boxGeometry args={[0.015, H, 0.015]} />
              <meshPhysicalMaterial color="#9a9ea2" roughness={0.35} metalness={0.7} />
            </mesh>
          ))
        ))}

        <lineSegments position={[0, chassisH + H / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(boxL, H, W)]} />
          <lineBasicMaterial color="#5577aa" transparent opacity={0.12} />
        </lineSegments>
      </group>

      {/* ── Doors ── */}
      <SwingDoor
        position={[boxStartX - 0.015, chassisH + H / 2, W / 4]}
        size={[0.03, H * 0.92, W / 2 - 0.02]}
        pivotOffset={[0, 0, W / 4 - 0.01]}
        isOpen={doors.rear}
        openAngle={Math.PI * 0.45}
        direction={1}
        material={ALUMINIUM}
      />
      <SwingDoor
        position={[boxStartX - 0.015, chassisH + H / 2, -W / 4]}
        size={[0.03, H * 0.92, W / 2 - 0.02]}
        pivotOffset={[0, 0, -(W / 4 - 0.01)]}
        isOpen={doors.rear}
        openAngle={Math.PI * 0.45}
        direction={-1}
        material={ALUMINIUM}
      />

      {hasTailLift && (
        <TailLift position={[boxStartX - 0.02, chassisH, 0]} size={[0.6, 0.04, W * 0.85]} isOpen={doors.rear} />
      )}

      <Taillight position={[boxStartX - 0.02, chassisH + H * 0.3, W / 2 - 0.04]} size={[0.03, 0.1, 0.06]} />
      <Taillight position={[boxStartX - 0.02, chassisH + H * 0.3, -W / 2 + 0.04]} size={[0.03, 0.1, 0.06]} />
      <BodyPanel position={[boxStartX - 0.035, chassisH + 0.04, 0]} size={[0.05, 0.08, W + 0.04]} material={BUMPER_PLASTIC} radius={0.012} />

      {/* ── Wheels ── */}
      <DetailWheel position={[cabinCenterX + cabinL * 0.15, wheelR, W / 2 + wheelW / 2 + 0.02]} radius={wheelR} width={wheelW} />
      <DetailWheel position={[cabinCenterX + cabinL * 0.15, wheelR, -W / 2 - wheelW / 2 - 0.02]} radius={wheelR} width={wheelW} />
      <DetailWheel position={[boxStartX + boxL * 0.18, wheelR, W / 2 + wheelW / 2 + 0.02]} radius={wheelR} width={wheelW} />
      <DetailWheel position={[boxStartX + boxL * 0.18, wheelR, -W / 2 - wheelW / 2 - 0.02]} radius={wheelR} width={wheelW} />
      <DetailWheel position={[boxStartX + boxL * 0.18 + wheelR * 2.2, wheelR, W / 2 + wheelW / 2 + 0.02]} radius={wheelR} width={wheelW} />
      <DetailWheel position={[boxStartX + boxL * 0.18 + wheelR * 2.2, wheelR, -W / 2 - wheelW / 2 - 0.02]} radius={wheelR} width={wheelW} />
    </group>
  );
}
