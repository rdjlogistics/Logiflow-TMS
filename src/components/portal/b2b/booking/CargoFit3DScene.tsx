import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { VehicleCapacity, CargoItem } from './types';
import { getVehicleComponent, getVehicleBrand, type DoorState } from './vehicles';
import { VehicleCaddy } from './vehicles/VehicleCaddy';
import { VehicleSprinter } from './vehicles/VehicleSprinter';
import { VehicleBakwagen } from './vehicles/VehicleBakwagen';
import { VehicleDAF } from './vehicles/VehicleDAF';
import { VehicleTruck } from './vehicles/VehicleTruck';
import { VehicleTrailer } from './vehicles/VehicleTrailer';

const CARGO_COLORS = [
  { from: [0.35, 0.55, 0.90], edge: '#6090dd' },
  { from: [0.30, 0.72, 0.55], edge: '#55bb88' },
  { from: [0.65, 0.45, 0.80], edge: '#aa77cc' },
  { from: [0.90, 0.60, 0.30], edge: '#dd9944' },
  { from: [0.85, 0.40, 0.55], edge: '#dd6688' },
  { from: [0.40, 0.75, 0.70], edge: '#66bbaa' },
];

interface CargoFit3DSceneProps {
  vehicle: VehicleCapacity;
  cargoItems: CargoItem[];
  doors: DoorState;
  cargoOnly?: boolean;
}

const S = 0.01;

// ─── Vehicle-specific cargo bay offset ───
function getCargoOffset(vehicle: VehicleCapacity): { offsetX: number; chassisH: number } {
  const L = vehicle.lengthCm * S;
  const component = getVehicleComponent(vehicle.type);

  switch (component) {
    case 'caddy': {
      const totalL = L * 1.55;
      const hoodL = totalL * 0.30;
      const cabinL = totalL * 0.22;
      const cabinEnd = totalL / 2 - hoodL - cabinL;
      return { offsetX: cabinEnd - L / 2, chassisH: 0.10 };
    }
    case 'sprinter': {
      const totalL = L * 1.35;
      const hoodL = totalL * 0.18;
      const cabinL = totalL * 0.18;
      const cabinEnd = totalL / 2 - hoodL - cabinL;
      return { offsetX: cabinEnd - L / 2, chassisH: 0.12 };
    }
    case 'bakwagen': {
      const totalL = L * 1.40;
      const hoodL = totalL * 0.20;
      const cabinL = totalL * 0.15;
      const cabinEnd = totalL / 2 - hoodL - cabinL;
      return { offsetX: cabinEnd - L / 2, chassisH: 0.15 };
    }
    default:
      return { offsetX: 0, chassisH: 0.15 };
  }
}

// ─── Vehicle Model Renderer ───
function VehicleModelRenderer({ vehicle, doors }: { vehicle: VehicleCapacity; doors: DoorState }) {
  const component = getVehicleComponent(vehicle.type);
  const props = { lengthCm: vehicle.lengthCm, widthCm: vehicle.widthCm, heightCm: vehicle.heightCm, doors };
  const trailerVariant = vehicle.type === 'koeloplegger' ? 'koel' : vehicle.type === 'containerchassis' ? 'chassis' : 'standard';

  switch (component) {
    case 'caddy': return <VehicleCaddy {...props} />;
    case 'sprinter': return <VehicleSprinter {...props} />;
    case 'bakwagen': return <VehicleBakwagen {...props} hasTailLift={vehicle.hasTailLift} />;
    case 'daf': return <VehicleDAF {...props} />;
    case 'truck': return <VehicleTruck {...props} />;
    case 'trailer': return <VehicleTrailer {...props} variant={trailerVariant} />;
    default: return <VehicleSprinter {...props} />;
  }
}

// ─── 3D Cargo Packing ───
interface PackedItem3D {
  item: CargoItem;
  index: number;
  x: number; z: number; y: number;
  colorIdx: number;
}

function pack3D(vehicle: VehicleCapacity, cargoItems: CargoItem[]): PackedItem3D[] {
  const vW = vehicle.widthCm, vL = vehicle.lengthCm, vH = vehicle.heightCm;
  const result: PackedItem3D[] = [];
  type Column = { x: number; z: number; w: number; d: number; currentHeight: number };
  const columns: Column[] = [];
  let rowX = 0, rowZ = 0, rowDepth = 0;
  const uniqueIds = [...new Set(cargoItems.map(i => i.id))];
  const colorMap = new Map<string, number>();
  uniqueIds.forEach((id, i) => colorMap.set(id, i % CARGO_COLORS.length));

  for (const item of cargoItems) {
    if (item.length <= 0 || item.width <= 0 || item.height <= 0) continue;
    for (let q = 0; q < item.quantity; q++) {
      const w = item.width, d = item.length, h = item.height;
      let col = columns.find(c => c.w === w && c.d === d && item.stackable && c.currentHeight + h <= vH);
      if (!col) {
        if (rowX + w > vW) { rowX = 0; rowZ += rowDepth; rowDepth = 0; }
        if (rowZ + d > vL) break;
        col = { x: rowX, z: rowZ, w, d, currentHeight: 0 };
        columns.push(col);
        rowX += w;
        rowDepth = Math.max(rowDepth, d);
      }
      result.push({ item, index: q, x: col.x, z: col.z, y: col.currentHeight, colorIdx: colorMap.get(item.id) ?? 0 });
      col.currentHeight += h;
    }
  }
  return result;
}

// ─── Cargo Item Mesh ───
function CargoItemMesh({ packed, vehicle, chassisH }: { packed: PackedItem3D; vehicle: VehicleCapacity; chassisH: number }) {
  const [hovered, setHovered] = useState(false);
  const { item, x, z, y, colorIdx } = packed;
  const L = vehicle.lengthCm * S, W = vehicle.widthCm * S;
  const w3 = item.width * S, d3 = item.length * S, h3 = item.height * S;
  // Position relative to cargo bay origin (bottom-left-front corner)
  const posX = -L / 2 + z * S + d3 / 2;
  const posY = chassisH + 0.03 + y * S + h3 / 2;
  const posZ = -W / 2 + x * S + w3 / 2;
  const c = CARGO_COLORS[colorIdx];

  return (
    <group position={[posX, posY, posZ]}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.03 : 1}
        castShadow
      >
        <boxGeometry args={[d3 - 0.01, h3 - 0.01, w3 - 0.01]} />
        <meshStandardMaterial
          color={new THREE.Color(...(c.from as [number, number, number]))}
          transparent opacity={hovered ? 0.92 : 0.85}
          roughness={0.35} metalness={0.15}
        />
      </mesh>
      <lineSegments scale={hovered ? 1.03 : 1}>
        <edgesGeometry args={[new THREE.BoxGeometry(d3 - 0.01, h3 - 0.01, w3 - 0.01)]} />
        <lineBasicMaterial color={c.edge} transparent opacity={0.9} />
      </lineSegments>
      {/* Tiny label */}
      <Html center position={[0, h3 / 2 + 0.02, 0]} distanceFactor={5} style={{ pointerEvents: 'none' }}>
        <div className="px-1 py-0.5 rounded bg-card/90 backdrop-blur-sm border border-border/40 shadow-sm max-w-[80px] truncate">
          <span className="font-semibold text-foreground" style={{ fontSize: '7px', lineHeight: '10px' }}>{item.description || 'Item'}</span>
        </div>
      </Html>
      {/* Hover tooltip - small */}
      {hovered && (
        <Html center distanceFactor={5} style={{ pointerEvents: 'none' }}>
          <div className="px-2 py-1 rounded-lg bg-card/95 backdrop-blur-xl border border-border/50 shadow-xl max-w-[100px]">
            <p className="font-semibold text-foreground truncate" style={{ fontSize: '9px' }}>{item.description || 'Item'}</p>
            <p className="text-muted-foreground font-mono" style={{ fontSize: '8px' }}>{item.length}×{item.width}×{item.height}cm · {item.weight}kg</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Cargo Space Walls ───
function CargoSpaceWalls({ vehicle, enhanced }: { vehicle: VehicleCapacity; enhanced?: boolean }) {
  const L = vehicle.lengthCm * S, W = vehicle.widthCm * S, H = vehicle.heightCm * S;
  const { chassisH } = getCargoOffset(vehicle);
  const wallOpacity = enhanced ? 0.35 : 0.25;
  const floorOpacity = enhanced ? 0.7 : 0.6;
  const wallMat = { color: '#ffffff', transparent: true, opacity: wallOpacity, roughness: 0.5, metalness: 0.1 };
  const floorMat = { color: '#c8c8c8', transparent: true, opacity: floorOpacity, roughness: 0.5, metalness: 0.1 };

  return (
    <group>
      <mesh position={[0, chassisH + 0.01, 0]} receiveShadow>
        <boxGeometry args={[L, 0.008, W]} />
        <meshStandardMaterial {...floorMat} />
      </mesh>
      <mesh position={[0, chassisH + H / 2, W / 2]}>
        <boxGeometry args={[L, H, 0.005]} />
        <meshStandardMaterial {...wallMat} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, chassisH + H / 2, -W / 2]}>
        <boxGeometry args={[L, H, 0.005]} />
        <meshStandardMaterial {...wallMat} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, chassisH + H, 0]}>
        <boxGeometry args={[L, 0.005, W]} />
        <meshStandardMaterial {...wallMat} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[L / 2, chassisH + H / 2, 0]}>
        <boxGeometry args={[0.005, H, W]} />
        <meshStandardMaterial {...wallMat} side={THREE.DoubleSide} />
      </mesh>
      {/* Front wall (only in cargo-only mode) */}
      {enhanced && (
        <mesh position={[-L / 2, chassisH + H / 2, 0]}>
          <boxGeometry args={[0.005, H, W]} />
          <meshStandardMaterial {...wallMat} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ─── Grid Floor ───
function GridFloor({ size }: { size: number }) {
  return (
    <group>
      <gridHelper args={[size * 2, 20, '#b0b8c8', '#d8dde8']} position={[0, 0, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
        <planeGeometry args={[size * 2, size * 2]} />
        <meshStandardMaterial color="#e8ecf0" roughness={0.8} metalness={0.05} />
      </mesh>
    </group>
  );
}

export const CargoFit3DScene = ({ vehicle, cargoItems, doors, cargoOnly = false }: CargoFit3DSceneProps) => {
  const packed = useMemo(() => pack3D(vehicle, cargoItems), [vehicle, cargoItems]);
  const brand = useMemo(() => getVehicleBrand(vehicle.type), [vehicle.type]);
  const { offsetX, chassisH } = useMemo(() => getCargoOffset(vehicle), [vehicle]);

  const L = vehicle.lengthCm * S, W = vehicle.widthCm * S;
  const baseDist = Math.max(L, W) * 1.3 + 2;
  const cameraDistance = cargoOnly ? baseDist * 0.7 : baseDist;
  const floorSize = Math.max(L, W) * 1.5 + 3;

  const elev = (35 * Math.PI) / 180;
  const azim = (-30 * Math.PI) / 180;
  const camX = cameraDistance * Math.cos(elev) * Math.sin(azim);
  const camY = cameraDistance * Math.sin(elev);
  const camZ = cameraDistance * Math.cos(elev) * Math.cos(azim);

  return (
    <div className="relative w-full h-[480px] rounded-2xl overflow-hidden border border-border/30 bg-background/80">
      {/* Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/80 backdrop-blur-xl border border-border/30 shadow-lg">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <div className="flex flex-col">
          {cargoOnly ? (
            <>
              <span className="text-[9px] font-medium text-muted-foreground tracking-wider uppercase">Laadruimte</span>
              <span className="text-[11px] font-bold text-foreground -mt-0.5">{(vehicle.lengthCm/100).toFixed(1)}×{(vehicle.widthCm/100).toFixed(1)}×{(vehicle.heightCm/100).toFixed(1)}m</span>
            </>
          ) : (
            <>
              <span className="text-[9px] font-medium text-muted-foreground tracking-wider uppercase">{brand.brand}</span>
              <span className="text-[11px] font-bold text-foreground -mt-0.5">{brand.model}</span>
            </>
          )}
        </div>
      </div>

      {/* 3D badge */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/80 backdrop-blur-xl border border-primary/25 shadow-lg">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-[10px] font-bold text-primary tracking-wider">{cargoOnly ? 'CARGO' : '3D'}</span>
      </div>

      <Canvas
        camera={{ position: [camX, camY, camZ], fov: 38, near: 0.1, far: 100 }}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.4 }}
      >
        <color attach="background" args={['#f0f4f8']} />
        <fog attach="fog" args={['#f0f4f8', 30, 60]} />

        <ambientLight intensity={1.5} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={2.0}
          castShadow
          shadow-mapSize={2048}
          shadow-bias={-0.0001}
          color="#ffffff"
        />
        <directionalLight position={[-4, 6, -2]} intensity={1.0} color="#eef2ff" />

        <group position={[0, 0, 0]}>
          {!cargoOnly && <VehicleModelRenderer vehicle={vehicle} doors={doors} />}
          
          {/* Cargo group offset to match vehicle cargo bay */}
          <group position={[cargoOnly ? 0 : offsetX, 0, 0]}>
            <CargoSpaceWalls vehicle={vehicle} enhanced={cargoOnly} />
            {packed.map((p, i) => (
              <CargoItemMesh key={`cargo-${p.item.id}-${p.index}`} packed={p} vehicle={vehicle} chassisH={chassisH} />
            ))}
          </group>
        </group>

        <GridFloor size={floorSize} />

        <OrbitControls
          autoRotate autoRotateSpeed={0.5}
          enablePan enableZoom enableDamping dampingFactor={0.08}
          minPolarAngle={Math.PI * 0.2} maxPolarAngle={Math.PI * 0.65}
          minDistance={2} maxDistance={15}
        />
      </Canvas>
    </div>
  );
};
