import * as THREE from 'three';
import {
  PAINT_GLOSSY_WHITE, PAINT_DARK, CHROME, ALUMINIUM, BUMPER_PLASTIC,
  DetailWheel, Headlight, Taillight, SideMirror, SwingDoor,
  GlassPanel, Grille, WheelArch, BodyPanel,
  VehicleModelProps,
} from './shared';

const S = 0.01;

interface VehicleTrailerProps extends VehicleModelProps {
  variant?: 'standard' | 'koel' | 'chassis';
}

export function VehicleTrailer({ lengthCm, widthCm, heightCm, doors, variant = 'standard' }: VehicleTrailerProps) {
  const L = lengthCm * S;
  const W = widthCm * S;
  const H = heightCm * S;

  const tractorL = 2.5 * S * 100;
  const tractorH = H * 0.7;
  const tractorY = 0.45;
  const trailerL = L - tractorL - 0.15;
  const trailerH = H;
  const trailerY = 0.18;
  const wheelR = 0.4;

  const tractorFront = L / 2 - tractorL / 2;
  const trailerCenter = -L / 2 + trailerL / 2 + 0.03;

  return (
    <group>
      {/* ═══════ TRACTOR ═══════ */}
      <group position={[tractorFront, tractorY, 0]}>
        <BodyPanel position={[0, tractorH / 2, 0]} size={[tractorL, tractorH, W * 0.92]} material={PAINT_GLOSSY_WHITE} radius={0.06} />
        <BodyPanel position={[-tractorL * 0.1, tractorH + 0.04, 0]} size={[tractorL * 0.7, 0.06, W * 0.88]} material={PAINT_GLOSSY_WHITE} radius={0.025} />

        <GlassPanel position={[tractorL / 2 + 0.005, tractorH * 0.6, 0]} size={[tractorH * 0.5, W * 0.82]} rotation={[0, Math.PI / 2, 0]} />
        {[-1, 1].map((s) => (
          <GlassPanel key={`tw-${s}`} position={[0, tractorH * 0.6, s * W * 0.465]} size={[tractorL * 0.6, tractorH * 0.35]} />
        ))}

        <Grille position={[tractorL / 2 + 0.01, tractorH * 0.18, 0]} size={[W * 0.7, tractorH * 0.25]} slats={6} />
        <Headlight position={[tractorL / 2 + 0.01, tractorH * 0.3, W * 0.38]} size={[0.14, 0.09, 0.06]} />
        <Headlight position={[tractorL / 2 + 0.01, tractorH * 0.3, -W * 0.38]} size={[0.14, 0.09, 0.06]} />
        <SideMirror position={[tractorL * 0.3, tractorH * 0.75, W * 0.5]} side="left" />
        <SideMirror position={[tractorL * 0.3, tractorH * 0.75, -W * 0.5]} side="right" />
        <BodyPanel position={[tractorL / 2 + 0.035, 0.08, 0]} size={[0.07, 0.18, W * 0.9]} material={BUMPER_PLASTIC} radius={0.02} />

        {/* Exhaust stacks */}
        {[-1, 1].map((s) => (
          <mesh key={`exh-${s}`} position={[-tractorL * 0.3, tractorH * 0.6, s * W * 0.48]}>
            <cylinderGeometry args={[0.025, 0.025, tractorH * 0.5, 12]} />
            <meshPhysicalMaterial {...CHROME} />
          </mesh>
        ))}

        {/* Fifth wheel */}
        <mesh position={[-tractorL / 2 - 0.03, -0.05, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.06, 20]} />
          <meshPhysicalMaterial {...PAINT_DARK} />
        </mesh>
      </group>

      {/* Tractor wheels */}
      <DetailWheel position={[tractorFront + tractorL * 0.2, wheelR, W * 0.44]} radius={wheelR} width={0.22} />
      <DetailWheel position={[tractorFront + tractorL * 0.2, wheelR, -W * 0.44]} radius={wheelR} width={0.22} />
      {[-0.15, 0.15].map((off) => (
        <DetailWheel key={`trl-${off}`} position={[tractorFront - tractorL * 0.35, wheelR, W * 0.36 + off]} radius={wheelR} width={0.18} />
      ))}
      {[-0.15, 0.15].map((off) => (
        <DetailWheel key={`trr-${off}`} position={[tractorFront - tractorL * 0.35, wheelR, -W * 0.36 + off]} radius={wheelR} width={0.18} />
      ))}

      {/* ═══════ TRAILER ═══════ */}
      <group position={[trailerCenter, trailerY, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={`tc-${s}`} position={[0, -0.02, s * W * 0.2]}>
            <boxGeometry args={[trailerL, 0.1, 0.06]} />
            <meshPhysicalMaterial {...PAINT_DARK} />
          </mesh>
        ))}

        {variant === 'chassis' ? (
          <group>
            {[-1, 1].map((xS) =>
              [-1, 1].map((zS) => (
                <mesh key={`post-${xS}-${zS}`} position={[xS * trailerL * 0.48, trailerH / 2, zS * W * 0.46]}>
                  <boxGeometry args={[0.05, trailerH, 0.05]} />
                  <meshPhysicalMaterial {...PAINT_DARK} />
                </mesh>
              ))
            )}
            {[-1, 1].map((s) => (
              <mesh key={`tr-${s}`} position={[0, trailerH, s * W * 0.46]}>
                <boxGeometry args={[trailerL * 0.96, 0.04, 0.04]} />
                <meshPhysicalMaterial {...PAINT_DARK} />
              </mesh>
            ))}
            {Array.from({ length: 3 }).map((_, i) => (
              <mesh key={`xb-${i}`} position={[-trailerL * 0.3 + i * trailerL * 0.3, trailerH, 0]}>
                <boxGeometry args={[0.04, 0.04, W * 0.92]} />
                <meshPhysicalMaterial {...PAINT_DARK} />
              </mesh>
            ))}
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[trailerL, 0.03, W * 0.94]} />
              <meshPhysicalMaterial {...PAINT_DARK} />
            </mesh>
          </group>
        ) : (
          <group>
            <mesh position={[0, 0, 0]} receiveShadow>
              <boxGeometry args={[trailerL, 0.05, W * 0.96]} />
              <meshPhysicalMaterial {...ALUMINIUM} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={`tw-${s}`} position={[0, trailerH / 2, s * W * 0.48]}>
                <boxGeometry args={[trailerL, trailerH, 0.03]} />
                <meshPhysicalMaterial {...ALUMINIUM} transparent opacity={0.35} />
              </mesh>
            ))}
            <mesh position={[0, trailerH + 0.015, 0]}>
              <boxGeometry args={[trailerL, 0.025, W * 0.96]} />
              <meshPhysicalMaterial {...ALUMINIUM} transparent opacity={0.2} />
            </mesh>
            <mesh position={[trailerL / 2 - 0.015, trailerH / 2, 0]}>
              <boxGeometry args={[0.03, trailerH, W * 0.96]} />
              <meshPhysicalMaterial {...ALUMINIUM} transparent opacity={0.3} />
            </mesh>

            {Array.from({ length: 6 }).map((_, i) => {
              const xPos = -trailerL / 2 + (i + 1) * (trailerL / 7);
              return [-1, 1].map((s) => (
                <mesh key={`rib-${i}-${s}`} position={[xPos, trailerH / 2, s * W * 0.485]}>
                  <boxGeometry args={[0.025, trailerH * 0.92, 0.018]} />
                  <meshPhysicalMaterial color="#999" roughness={0.4} metalness={0.6} />
                </mesh>
              ));
            })}

            {variant === 'koel' && (
              <group position={[trailerL / 2 + 0.06, trailerH * 0.7, 0]}>
                <BodyPanel position={[0, 0, 0]} size={[0.15, trailerH * 0.35, W * 0.6]} material={{ color: '#3a5a8a', roughness: 0.35, metalness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.1 }} radius={0.03} />
                {[-1, 0, 1].map((i) => (
                  <mesh key={`vent-${i}`} position={[0.08, i * 0.08, 0]}>
                    <boxGeometry args={[0.01, 0.05, W * 0.45]} />
                    <meshPhysicalMaterial {...PAINT_DARK} />
                  </mesh>
                ))}
              </group>
            )}

            {[-1, 1].map((s) => (
              <SwingDoor
                key={`rd-${s}`}
                position={[-trailerL / 2 - 0.015, trailerH / 2, s * W * 0.24]}
                size={[0.03, trailerH * 0.94, W * 0.46]}
                pivotOffset={[0, 0, s * W * 0.23]}
                isOpen={doors.rear}
                openAngle={Math.PI * 0.45}
                direction={-s}
                material={ALUMINIUM}
              />
            ))}
          </group>
        )}
      </group>

      {/* Trailer taillights */}
      <Taillight position={[-L / 2 + 0.03, trailerY + trailerH * 0.3, W * 0.44]} size={[0.05, 0.1, 0.07]} />
      <Taillight position={[-L / 2 + 0.03, trailerY + trailerH * 0.3, -W * 0.44]} size={[0.05, 0.1, 0.07]} />

      {/* Trailer wheels: 3 axles */}
      {[-0.25, 0, 0.25].map((axleOff) => (
        <group key={`axle-${axleOff}`}>
          <DetailWheel position={[trailerCenter - trailerL * 0.35 + axleOff, wheelR * 0.9, W * 0.42]} radius={wheelR * 0.85} width={0.2} />
          <DetailWheel position={[trailerCenter - trailerL * 0.35 + axleOff, wheelR * 0.9, -W * 0.42]} radius={wheelR * 0.85} width={0.2} />
        </group>
      ))}

      {/* Mudguards */}
      <BodyPanel position={[trailerCenter - trailerL * 0.35, wheelR * 1.6, W * 0.42]} size={[1.0, 0.03, 0.25]} material={PAINT_DARK} radius={0.01} />
      <BodyPanel position={[trailerCenter - trailerL * 0.35, wheelR * 1.6, -W * 0.42]} size={[1.0, 0.03, 0.25]} material={PAINT_DARK} radius={0.01} />
    </group>
  );
}
