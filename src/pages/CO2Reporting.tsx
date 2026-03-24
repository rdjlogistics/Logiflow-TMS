import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Leaf,
  TrendingDown,
  TrendingUp,
  Truck,
  Route,
  Download,
  Calendar,
  Target,
  Award,
  Info,
  Scale,
  Euro,
  Loader2
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Line
} from "recharts";

import { useCO2Data, berekenCO2Compensatie, type CO2Summary } from "@/hooks/useCO2Data";

// Sector benchmark: gemiddelde CO2 uitstoot per km voor zwaar transport (NL)
const SECTOR_BENCHMARK_KG_PER_KM = 0.25;

function exportCO2CSV(data: CO2Summary, year: string) {
  const rows: (string | number)[][] = [
    ['Periode', year],
    ['Totaal CO2 (kg)', data.totalCo2Kg],
    ['Totaal ritten', data.totalTrips],
    ['Totaal km', data.totalKm],
    ['Gem. CO2/rit (kg)', data.avgCo2PerTrip],
    [''],
    ['Maand', 'CO2 (kg)', 'Ritten', 'KM'],
    ...data.monthlyData.map(m => [m.month, m.co2, m.trips, m.km]),
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LogiFlow-CO2-${year}.csv`;
  a.click();
}

const CO2Reporting = () => {
  const [period, setPeriod] = useState("year");
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const { data: co2Data, isLoading: co2Loading } = useCO2Data(year, period);

  // All values from real data — no mock fallbacks
  const totalEmissions = co2Data?.totalCo2Kg ?? 0;
  const avgPerTrip = co2Data?.avgCo2PerTrip ?? 0;
  const totalKm = co2Data?.totalKm ?? 0;
  const totalTrips = co2Data?.totalTrips ?? 0;
  const avgPerKm = co2Data?.avgCo2PerKm ?? 0;
  const chartMonthly = co2Data?.monthlyData ?? [];
  const chartVehicles = co2Data?.byVehicleType ?? [];
  const chartRoutes = co2Data?.topRoutes?.map(r => ({
    route: r.route,
    km: r.km,
    co2: r.co2,
    trips: r.trips,
    efficiency: totalKm > 0 ? Math.round(Math.max(0, Math.min(100, 100 - ((r.co2 / Math.max(r.km, 1)) / SECTOR_BENCHMARK_KG_PER_KM - 1) * 50))) : 0,
  })) ?? [];

  // CO2 compensatie kosten
  const co2Compensatie = berekenCO2Compensatie(totalEmissions);

  // ESG benchmark vergelijking
  const benchmarkCo2 = totalKm > 0 ? totalKm * SECTOR_BENCHMARK_KG_PER_KM : 0;
  const esgVerschilPct = benchmarkCo2 > 0
    ? Math.round(((totalEmissions - benchmarkCo2) / benchmarkCo2) * 100)
    : 0;
  const esgBeterDanSector = totalEmissions < benchmarkCo2;

  const handleExportReport = () => {
    if (!co2Data) return;
    exportCO2CSV(co2Data, year);
  };

  const noData = !co2Loading && totalTrips === 0;

  return (
    <DashboardLayout 
      title="CO₂ Rapportage" 
      description="Monitor en reduceer uw transport emissies"
    >
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Maand</SelectItem>
                <SelectItem value="quarter">Kwartaal</SelectItem>
                <SelectItem value="year">Jaar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleExportReport} disabled={!co2Data || totalTrips === 0}>
            <Download className="h-4 w-4 mr-2" />
            Download ESG Rapport (CSV)
          </Button>
        </div>

        {co2Loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : noData ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Leaf className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">Geen ritdata gevonden voor deze periode</p>
              <p className="text-sm text-muted-foreground mt-1">Selecteer een andere periode of voeg ritten toe</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-l-4 border-l-emerald-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Totale CO₂ Uitstoot</CardTitle>
                  <Leaf className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(totalEmissions / 1000).toFixed(1)} ton</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Route className="h-3 w-3 mr-1" />
                    <span>{totalKm.toLocaleString('nl-NL')} km gereden</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gemiddeld per Rit</CardTitle>
                  <Route className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgPerTrip} kg</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span>{totalTrips} ritten in periode</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gem. per KM</CardTitle>
                  <Truck className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgPerKm} kg/km</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {avgPerKm > 0 && avgPerKm < SECTOR_BENCHMARK_KG_PER_KM ? (
                      <><TrendingDown className="h-3 w-3 mr-1 text-emerald-500" /><span>Onder sector benchmark</span></>
                    ) : avgPerKm > 0 ? (
                      <><TrendingUp className="h-3 w-3 mr-1 text-red-500" /><span>Boven sector benchmark</span></>
                    ) : <span>—</span>}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-violet-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CO₂ Compensatie</CardTitle>
                  <Euro className="h-4 w-4 text-violet-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€{co2Compensatie.toFixed(0)}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span>€15/ton marktprijs</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Target Progress */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>CO₂ Overzicht {year}</CardTitle>
                    <CardDescription>
                      Voortgang en details voor geselecteerde periode
                    </CardDescription>
                  </div>
                  {esgBeterDanSector && totalKm > 0 && (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500">
                      <Target className="h-3 w-3 mr-1" />
                      Beter dan sector
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{totalTrips.toLocaleString('nl-NL')}</div>
                    <div className="text-xs text-muted-foreground">Ritten</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{totalKm.toLocaleString('nl-NL')}</div>
                    <div className="text-xs text-muted-foreground">Kilometers</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-500">{(totalEmissions / 1000).toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Ton CO₂</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ESG Benchmark + CO2 compensatie */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-base">ESG Benchmark</CardTitle>
                  </div>
                  <CardDescription>
                    Vergelijking met sector benchmark ({SECTOR_BENCHMARK_KG_PER_KM} kg/km)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Eigen uitstoot (gem./km)</span>
                    <span className="font-medium">
                      {totalKm > 0 ? (totalEmissions / totalKm).toFixed(2) : '—'} kg/km
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sector benchmark</span>
                    <span className="font-medium">{SECTOR_BENCHMARK_KG_PER_KM} kg/km</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t pt-2">
                    <span className="font-medium">Verschil vs sector</span>
                    {totalKm > 0 ? (
                      <Badge
                        variant="outline"
                        className={esgBeterDanSector
                          ? 'text-emerald-600 border-emerald-500'
                          : 'text-red-600 border-red-500'}
                      >
                        {esgBeterDanSector ? '▼' : '▲'} {Math.abs(esgVerschilPct)}%{' '}
                        {esgBeterDanSector ? 'beter' : 'slechter'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  {totalKm > 0 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      {esgBeterDanSector
                        ? `U stoot ${Math.round(benchmarkCo2 - totalEmissions)} kg minder uit dan het sectorgemiddelde.`
                        : `U stoot ${Math.round(totalEmissions - benchmarkCo2)} kg meer uit dan het sectorgemiddelde.`}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-emerald-500" />
                    <CardTitle className="text-base">CO₂ Compensatie</CardTitle>
                  </div>
                  <CardDescription>
                    Kosten om uw uitstoot te compenseren (€15/ton)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Totale uitstoot</span>
                    <span className="font-medium">{(totalEmissions / 1000).toFixed(2)} ton CO₂</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Compensatietarief</span>
                    <span className="font-medium">€15 / ton</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t pt-2">
                    <span className="font-semibold">Compensatiekosten</span>
                    <span className="text-xl font-bold text-emerald-600">
                      €{co2Compensatie.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="trend" className="space-y-4">
              <TabsList>
                <TabsTrigger value="trend">Trend Analyse</TabsTrigger>
                <TabsTrigger value="fleet">Vloot Verdeling</TabsTrigger>
                <TabsTrigger value="routes">Route Efficiëntie</TabsTrigger>
              </TabsList>

              <TabsContent value="trend">
                <Card>
                  <CardHeader>
                    <CardTitle>Maandelijkse CO₂ Uitstoot</CardTitle>
                    <CardDescription>CO₂ uitstoot per maand op basis van ritdata</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chartMonthly.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Geen maanddata beschikbaar</p>
                    ) : (
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartMonthly}>
                            <defs>
                              <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number, name: string) => {
                                if (name === 'CO₂ (kg)') return [`${value.toLocaleString('nl-NL')} kg`, name];
                                return [value, name];
                              }}
                            />
                            <Legend />
                            <Area 
                              type="monotone" 
                              dataKey="co2" 
                              name="CO₂ (kg)"
                              stroke="#22c55e" 
                              fillOpacity={1} 
                              fill="url(#colorCo2)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fleet">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Uitstoot per Voertuigklasse</CardTitle>
                      <CardDescription>Verdeling op basis van gekoppelde voertuigen</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {chartVehicles.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Geen voertuigdata beschikbaar</p>
                      ) : (
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                              <Pie
                                data={chartVehicles}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {chartVehicles.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number, name: string) => [`${value} ritten`, name]} />
                              <Legend />
                            </RePieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Vloot Samenstelling</CardTitle>
                      <CardDescription>Overzicht voertuigen per categorie</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {chartVehicles.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Geen voertuigdata beschikbaar</p>
                      ) : (
                        <div className="space-y-4">
                          {chartVehicles.map((item) => {
                            const totalVehicleTrips = chartVehicles.reduce((s, v) => s + v.value, 0);
                            const pct = totalVehicleTrips > 0 ? Math.round((item.value / totalVehicleTrips) * 100) : 0;
                            return (
                              <div key={item.name} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: item.color }}
                                    />
                                    {item.name}
                                  </span>
                                  <span className="font-medium">{pct}% ({item.value} ritten, {item.co2} kg CO₂)</span>
                                </div>
                                <Progress 
                                  value={pct} 
                                  className="h-2"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {chartVehicles.length > 0 && (
                        <div className="mt-6 p-4 bg-blue-500/10 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-blue-500">Verduurzamingsadvies</p>
                              <p className="text-muted-foreground mt-1">
                                {chartVehicles.some(v => v.name.toLowerCase().includes('electric') || v.name.toLowerCase().includes('elektrisch'))
                                  ? 'Uitbreiding van het elektrische wagenpark kan de totale CO₂ uitstoot verder reduceren.'
                                  : 'Het toevoegen van elektrische voertuigen kan de totale CO₂ uitstoot significant reduceren.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="routes">
                <Card>
                  <CardHeader>
                    <CardTitle>Route Efficiëntie Analyse</CardTitle>
                    <CardDescription>CO₂ uitstoot per populaire route (gemiddeld per rit)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chartRoutes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Geen routedata beschikbaar</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium">Route</th>
                              <th className="text-right py-3 px-4 font-medium">Ritten</th>
                              <th className="text-right py-3 px-4 font-medium">Gem. km</th>
                              <th className="text-right py-3 px-4 font-medium">Gem. CO₂ (kg)</th>
                              <th className="text-right py-3 px-4 font-medium">kg/km</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chartRoutes.map((route) => (
                              <tr key={route.route} className="border-b">
                                <td className="py-3 px-4 font-medium">{route.route}</td>
                                <td className="py-3 px-4 text-right">{route.trips}</td>
                                <td className="py-3 px-4 text-right">{route.km} km</td>
                                <td className="py-3 px-4 text-right">{route.co2} kg</td>
                                <td className="py-3 px-4 text-right">
                                  {route.km > 0 ? (route.co2 / route.km).toFixed(2) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CO2Reporting;
