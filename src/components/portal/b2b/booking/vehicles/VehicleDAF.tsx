import * as THREE from 'three';
import {
  PAINT_DARK, CHROME, ALUMINIUM, PAINT_VEHICLE_LIGHT, BUMPER_PLASTIC,
  DetailWheel, Headlight, Taillight, SideMirror, SwingDoor, TailLift,
  GlassPanel, Grille, WheelArch, BodyPanel,
  VehicleModelProps,
} from './shared';

const S = 0.01;

export function VehicleDAF({ lengthCm, widthCm, heightCm, doors }: VehicleModelProps) {
  const L = lengthCm * S;
  const W = widthCm * S;
  const H = heightCm * S;

  const cabL = L * 0.18;
  const cabH = H * 0.75;
  const cabY = 0.38;
  const boxL = L - cabL - 0.04;
  const boxH = H;
  const boxY = 0.15;
  const chassisH = 0.12;
  const wheelR = 0.38;

  const cabFront = L / 2 - cabL / 2;
  const boxCenter = -L / 2 + boxL / 2 + 0.02;

  return (
    <group>
      {/* ─── Chassis rails ─── */}
      {[-1, 1].map((s) => (
        <mesh key={`rail-${s}`} position={[0, chassisH / 2, s * W * 0.25]}>
          <boxGeometry args={[L * 0.95, chassisH, 0.06]} />
          <meshPhysicalMaterial {...PAINT_DARK} />
        </mesh>
      ))}

      {/* ─── Cabin (DAF LF style) ─── */}
      <group position={[cabFront, cabY, 0]}>
        <BodyPanel position={[0, cabH / 2, 0]} size={[cabL, cabH, W * 0.98]} material={PAINT_VEHICLE_LIGHT} radius={0.06} />
        <BodyPanel position={[cabL * 0.3, cabH + 0.02, 0]} size={[cabL * 0.5, 0.04, W * 0.95]} material={PAINT_VEHICLE_LIGHT} radius={0.02} />

        <GlassPanel position={[cabL / 2 + 0.005, cabH * 0.55, 0]} size={[cabH * 0.55, W * 0.85]} rotation={[0, Math.PI / 2, 0]} />
        {[-1, 1].map((s) => (
          <GlassPanel key={`sw-${s}`} position={[0, cabH * 0.55, s * W * 0.495]} size={[cabL * 0.65, cabH * 0.4]} />
        ))}

        <Grille position={[cabL / 2 + 0.01, cabH * 0.2, 0]} size={[W * 0.7, cabH * 0.3]} slats={6} />
        <Headlight position={[cabL / 2 + 0.01, cabH * 0.3, W * 0.38]} size={[0.14, 0.08, 0.05]} />
        <Headlight position={[cabL / 2 + 0.01, cabH * 0.3, -W * 0.38]} size={[0.14, 0.08, 0.05]} />
        <SideMirror position={[cabL * 0.3, cabH * 0.7, W * 0.5]} side="left" />
        <SideMirror position={[cabL * 0.3, cabH * 0.7, -W * 0.5]} side="right" />
        <BodyPanel position={[cabL / 2 + 0.03, 0.06, 0]} size={[0.06, 0.15, W * 0.95]} material={BUMPER_PLASTIC} radius={0.02} />

        <SwingDoor
          position={[0, cabH * 0.05, W * 0.49]}
          size={[cabL * 0.55, cabH * 0.85, 0.025]}
          pivotOffset={[cabL * 0.275, 0, 0]}
          isOpen={doors.side}
          openAngle={Math.PI * 0.5}
          direction={1}
          material={PAINT_VEHICLE_LIGHT}
        />

        <WheelArch position={[-cabL * 0.1, -cabY + wheelR + 0.05, W * 0.45]} radius={wheelR + 0.05} width={0.05} />
        <WheelArch position={[-cabL * 0.1, -cabY + wheelR + 0.05, -W * 0.45]} radius={wheelR + 0.05} width={0.05} />
      </group>

      {/* ─── Cargo box ─── */}
      <group position={[boxCenter, boxY, 0]}>
        <mesh position={[0, 0, 0]} receiveShadow>
          <boxGeometry args={[boxL, 0.04, W * 0.96]} />
          <meshPhysicalMaterial {...ALUMINIUM} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={`wall-${s}`} position={[0, boxH / 2, s * W * 0.48]}>
            <boxGeometry args={[boxL, boxH, 0.025]} />
            <meshPhysicalMaterial {...ALUMINIUM} transparent opacity={0.35} />
          </mesh>
        ))}
        <mesh position={[0, boxH + 0.01, 0]}>
          <boxGeometry args={[boxL, 0.02, W * 0.96]} />
          <meshPhysicalMaterial {...ALUMINIUM} transparent opacity={0.2} />
        </mesh>
        <mesh position={[boxL / 2 - 0.01, boxH / 2, 0]}>
          <boxGeometry args={[0.025, boxH, W * 0.96]} />
          <meshPhysicalMaterial {...ALUMINIUM} transparent opacity={0.3} />
        </mesh>

        {/* Ribs */}
        {Array.from({ length: 4 }).map((_, i) => {
          const xPos = -boxL / 2 + (i + 1) * (boxL / 5);
          return [-1, 1].map((s) => (
            <mesh key={`rib-${i}-${s}`} position={[xPos, boxH / 2, s * W * 0.485]}>
              <boxGeometry args={[0.02, boxH * 0.95, 0.015]} />
              <meshPhysicalMaterial color="#999" roughness={0.4} metalness={0.6} />
            </mesh>
          ));
        })}

        {[-1, 1].map((s) => (
          <SwingDoor
            key={`rear-${s}`}
            position={[-boxL / 2 - 0.01, boxH / 2, s * W * 0.24]}
            size={[0.025, boxH * 0.95, W * 0.46]}
            pivotOffset={[0, 0, s * W * 0.23]}
            isOpen={doors.rear}
            openAngle={Math.PI * 0.45}
            direction={-s}
            material={ALUMINIUM}
          />
        ))}
      </group>

      <TailLift position={[-L / 2 + 0.02, boxY + 0.02, 0]} size={[0.03, boxL * 0.15, W * 0.85]} isOpen={doors.rear} />

      <Taillight position={[-L / 2 + 0.02, boxY + boxH * 0.3, W * 0.44]} />
      <Taillight position={[-L / 2 + 0.02, boxY + boxH * 0.3, -W * 0.44]} />

      {/* ─── Wheels ─── */}
      <DetailWheel position={[cabFront - cabL * 0.1, wheelR, W * 0.45]} radius={wheelR} width={0.2} />
      <DetailWheel position={[cabFront - cabL * 0.1, wheelR, -W * 0.45]} radius={wheelR} width={0.2} />
      {[-0.15, 0.15].map((offset) => (
        <DetailWheel key={`rl-${offset}`} position={[-L * 0.32, wheelR, W * 0.38 + offset]} radius={wheelR} width={0.16} />
      ))}
      {[-0.15, 0.15].map((offset) => (
        <DetailWheel key={`rr-${offset}`} position={[-L * 0.32, wheelR, -W * 0.38 + offset]} radius={wheelR} width={0.16} />
      ))}
    </group>
  );
}
