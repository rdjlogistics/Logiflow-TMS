import * as THREE from 'three';
import {
  PAINT_VEHICLE_LIGHT, PAINT_DARK, CHROME, ALUMINIUM, BUMPER_PLASTIC,
  DetailWheel, Headlight, Taillight, SideMirror, SwingDoor, TailLift,
  GlassPanel, Grille, WheelArch, BodyPanel,
  VehicleModelProps,
} from './shared';

const S = 0.01;

export function VehicleTruck({ lengthCm, widthCm, heightCm, doors }: VehicleModelProps & { hasTailLift?: boolean }) {
  const L = lengthCm * S;
  const W = widthCm * S;
  const H = heightCm * S;

  const cabL = L * 0.15;
  const cabH = H * 0.82;
  const cabY = 0.42;
  const boxL = L - cabL - 0.06;
  const boxH = H;
  const boxY = 0.15;
  const wheelR = 0.42;

  const cabFront = L / 2 - cabL / 2;
  const boxCenter = -L / 2 + boxL / 2 + 0.03;

  return (
    <group>
      {/* ─── Heavy chassis rails ─── */}
      {[-1, 1].map((s) => (
        <mesh key={`rail-${s}`} position={[0, 0.07, s * W * 0.22]}>
          <boxGeometry args={[L * 0.92, 0.14, 0.08]} />
          <meshPhysicalMaterial {...PAINT_DARK} />
        </mesh>
      ))}

      {/* ─── Cabin ─── */}
      <group position={[cabFront, cabY, 0]}>
        <BodyPanel position={[0, cabH / 2, 0]} size={[cabL, cabH, W]} material={PAINT_VEHICLE_LIGHT} radius={0.06} />
        {/* Sun visor */}
        <BodyPanel position={[cabL * 0.35, cabH + 0.01, 0]} size={[cabL * 0.6, 0.03, W * 0.92]} material={PAINT_DARK} radius={0.01} />

        <GlassPanel position={[cabL / 2 + 0.005, cabH * 0.6, 0]} size={[cabH * 0.5, W * 0.88]} rotation={[0, Math.PI / 2, 0]} />
        {[-1, 1].map((s) => (
          <GlassPanel key={`sw-${s}`} position={[0.02, cabH * 0.6, s * W * 0.505]} size={[cabL * 0.6, cabH * 0.35]} />
        ))}

        <Grille position={[cabL / 2 + 0.015, cabH * 0.18, 0]} size={[W * 0.75, cabH * 0.28]} slats={7} />
        <Headlight position={[cabL / 2 + 0.015, cabH * 0.3, W * 0.4]} size={[0.16, 0.1, 0.06]} />
        <Headlight position={[cabL / 2 + 0.015, cabH * 0.3, -W * 0.4]} size={[0.16, 0.1, 0.06]} />
        <SideMirror position={[cabL * 0.35, cabH * 0.75, W * 0.55]} side="left" />
        <SideMirror position={[cabL * 0.35, cabH * 0.75, -W * 0.55]} side="right" />

        <BodyPanel position={[cabL / 2 + 0.04, 0.08, 0]} size={[0.08, 0.18, W * 0.98]} material={BUMPER_PLASTIC} radius={0.025} />

        {/* Steps */}
        {[-1, 1].map((s) => (
          <mesh key={`step-${s}`} position={[-cabL * 0.15, -0.1, s * W * 0.48]}>
            <boxGeometry args={[cabL * 0.3, 0.04, 0.12]} />
            <meshPhysicalMaterial {...CHROME} />
          </mesh>
        ))}

        <WheelArch position={[-cabL * 0.15, -cabY + wheelR + 0.05, W * 0.45]} radius={wheelR + 0.06} width={0.05} />
        <WheelArch position={[-cabL * 0.15, -cabY + wheelR + 0.05, -W * 0.45]} radius={wheelR + 0.06} width={0.05} />
      </group>

      {/* ─── Cargo box ─── */}
      <group position={[boxCenter, boxY, 0]}>
        <mesh position={[0, 0, 0]} receiveShadow>
          <boxGeometry args={[boxL, 0.05, W * 0.96]} />
          <meshPhysicalMaterial {...ALUMINIUM} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={`w-${s}`} position={[0, boxH / 2, s * W * 0.48]}>
            <boxGeometry args={[boxL, boxH, 0.03]} />
            <meshPhysicalMaterial {...ALUMINIUM} transparent opacity={0.35} />
          </mesh>
        ))}
        <mesh position={[0, boxH + 0.015, 0]}>
          <boxGeometry args={[boxL, 0.025, W * 0.96]} />
          <meshPhysicalMaterial {...ALUMINIUM} transparent opacity={0.2} />
        </mesh>
        <mesh position={[boxL / 2 - 0.015, boxH / 2, 0]}>
          <boxGeometry args={[0.03, boxH, W * 0.96]} />
          <meshPhysicalMaterial {...ALUMINIUM} transparent opacity={0.3} />
        </mesh>

        {/* Ribs */}
        {Array.from({ length: 5 }).map((_, i) => {
          const xPos = -boxL / 2 + (i + 1) * (boxL / 6);
          return [-1, 1].map((s) => (
            <mesh key={`rib-${i}-${s}`} position={[xPos, boxH / 2, s * W * 0.485]}>
              <boxGeometry args={[0.025, boxH * 0.92, 0.018]} />
              <meshPhysicalMaterial color="#999" roughness={0.4} metalness={0.6} />
            </mesh>
          ));
        })}

        {[-1, 1].map((s) => (
          <SwingDoor
            key={`rd-${s}`}
            position={[-boxL / 2 - 0.015, boxH / 2, s * W * 0.24]}
            size={[0.03, boxH * 0.94, W * 0.46]}
            pivotOffset={[0, 0, s * W * 0.23]}
            isOpen={doors.rear}
            openAngle={Math.PI * 0.45}
            direction={-s}
            material={ALUMINIUM}
          />
        ))}
      </group>

      <TailLift position={[-L / 2 + 0.03, boxY + 0.03, 0]} size={[0.035, boxL * 0.12, W * 0.88]} isOpen={doors.rear} />

      <Taillight position={[-L / 2 + 0.03, boxY + boxH * 0.3, W * 0.44]} size={[0.05, 0.1, 0.07]} />
      <Taillight position={[-L / 2 + 0.03, boxY + boxH * 0.3, -W * 0.44]} size={[0.05, 0.1, 0.07]} />

      {/* ─── Wheels ─── */}
      <DetailWheel position={[cabFront - cabL * 0.15, wheelR, W * 0.45]} radius={wheelR} width={0.22} />
      <DetailWheel position={[cabFront - cabL * 0.15, wheelR, -W * 0.45]} radius={wheelR} width={0.22} />
      {[-0.16, 0.16].map((off) => (
        <DetailWheel key={`drl-${off}`} position={[-L * 0.3, wheelR, W * 0.38 + off]} radius={wheelR} width={0.18} />
      ))}
      {[-0.16, 0.16].map((off) => (
        <DetailWheel key={`drr-${off}`} position={[-L * 0.3, wheelR, -W * 0.38 + off]} radius={wheelR} width={0.18} />
      ))}
    </group>
  );
}
