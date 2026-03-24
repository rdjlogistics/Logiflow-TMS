interface GpxStop {
  address: string;
  city: string;
  lat?: number;
  lng?: number;
  notes?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function exportRouteGPX(stops: GpxStop[]) {
  const waypoints = stops
    .filter((s) => s.lat != null && s.lng != null)
    .map((stop, i) => {
      const name = escapeXml([stop.address, stop.city].filter(Boolean).join(", ") || `Stop ${i + 1}`);
      const desc = stop.notes ? `<desc>${escapeXml(stop.notes)}</desc>` : "";
      return `  <wpt lat="${stop.lat}" lon="${stop.lng}">\n    <name>${name}</name>\n${desc ? `    ${desc}\n` : ""}  </wpt>`;
    })
    .join("\n");

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="LogiFlow Route Export"
  xmlns="http://www.topografix.com/GPX/1/1">
${waypoints}
</gpx>`;

  const blob = new Blob([gpx], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `route-export-${new Date().toISOString().slice(0, 10)}.gpx`;
  link.click();
  URL.revokeObjectURL(url);
}
