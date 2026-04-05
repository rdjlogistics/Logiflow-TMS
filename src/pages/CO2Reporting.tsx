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
  Target,
  Info,
  Scale,
  Euro,
  Loader2,
  Shield,
  FileText,
  Layers,
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
  BarChart,
  Bar,
} from "recharts";

import { useCO2Data, berekenCO2Compensatie, type CO2Summary } from "@/hooks/useCO2Data";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SECTOR_BENCHMARK_KG_PER_KM = 0.25;

function exportCO2CSV(data: CO2Summary, year: string) {
  const rows: (string | number)[][] = [
    ['Periode', year],
    ['Totaal CO2 TTW (kg)', data.totalCo2Kg],
    ['Totaal CO2 WTW (kg)', data.totalWtwCo2Kg],
    ['Totaal ritten', data.totalTrips],
    ['Totaal km', data.totalKm],
    ['Scope 1 (kg)', data.scopeBreakdown.scope1],
    ['Scope 2 (kg)', data.scopeBreakdown.scope2],
    ['Scope 3 (kg)', data.scopeBreakdown.scope3],
    [''],
    ['Maand', 'CO2 TTW (kg)', 'CO2 WTW (kg)', 'Ritten', 'KM'],
    ...data.monthlyData.map(m => [m.month, m.co2, m.wtw, m.trips, m.km]),
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CO2-GLEC-Rapport-${year}.csv`;
  a.click();
}

function exportCO2PDF(data: CO2Summary, year: string) {
  const doc = new jsPDF();
  const compensatie = berekenCO2Compensatie(data.totalWtwCo2Kg);

  doc.setFontSize(18);
  doc.text('CO2 Emissierapport - GLEC Framework', 14, 20);
  doc.setFontSize(10);
  doc.text(`Periode: ${year} | Gegenereerd: ${new Date().toLocaleDateString('nl-NL')}`, 14, 28);
  doc.text('Methode: GLEC Framework v3.0 - Well-to-Wheel (WTW)', 14, 34);

  doc.setFontSize(12);
  doc.text('Samenvatting', 14, 46);

  autoTable(doc, {
    startY: 50,
    head: [['Metriek', 'Waarde']],
    body: [
      ['Totaal CO2 (TTW)', `${(data.totalCo2Kg / 1000).toFixed(2)} ton`],
      ['Totaal CO2 (WTW)', `${(data.totalWtwCo2Kg / 1000).toFixed(2)} ton`],
      ['Totaal kilometers', data.totalKm.toLocaleString('nl-NL')],
      ['Totaal ritten', String(data.totalTrips)],
      ['Gem. CO2/km (TTW)', `${data.avgCo2PerKm} kg`],
      ['Gem. CO2/km (WTW)', `${data.avgWtwPerKm} kg`],
      ['Compensatiekosten', `EUR ${compensatie.toFixed(2)}`],
    ],
    theme: 'striped',
  });

  const scopeY = (doc as any).lastAutoTable?.finalY + 10 || 120;
  doc.setFontSize(12);
  doc.text('GHG Protocol - Scope Uitsplitsing', 14, scopeY);

  autoTable(doc, {
    startY: scopeY + 4,
    head: [['Scope', 'CO2 WTW (kg)', 'Beschrijving']],
    body: [
      ['Scope 1', String(data.scopeBreakdown.scope1), 'Directe emissies (eigen vloot)'],
      ['Scope 2', String(data.scopeBreakdown.scope2), 'Indirecte emissies (elektriciteit)'],
      ['Scope 3', String(data.scopeBreakdown.scope3), 'Ketenuitstoot (uitbesteed)'],
    ],
    theme: 'striped',
  });

  if (data.monthlyData.length > 0) {
    const monthY = (doc as any).lastAutoTable?.finalY + 10 || 180;
    doc.setFontSize(12);
    doc.text('Maandoverzicht', 14, monthY);

    autoTable(doc, {
      startY: monthY + 4,
      head: [['Maand', 'CO2 TTW (kg)', 'CO2 WTW (kg)', 'Ritten', 'KM']],
      body: data.monthlyData.map(m => [m.month, String(m.co2), String(m.wtw), String(m.trips), String(m.km)]),
      theme: 'striped',
    });
  }

  doc.save(`CO2-GLEC-Rapport-${year}.pdf`);
}

const CO2Reporting = () => {
  const [period, setPeriod] = useState("year");
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const { data: co2Data, isLoading: co2Loading } = useCO2Data(year, period);

  const totalEmissions = co2Data?.totalCo2Kg ?? 0;
  const totalWtw = co2Data?.totalWtwCo2Kg ?? 0;
  const avgPerTrip = co2Data?.avgCo2PerTrip ?? 0;
  const totalKm = co2Data?.totalKm ?? 0;
  const totalTrips = co2Data?.totalTrips ?? 0;
  const avgPerKm = co2Data?.avgCo2PerKm ?? 0;
  const avgWtwPerKm = co2Data?.avgWtwPerKm ?? 0;
  const chartMonthly = co2Data?.monthlyData ?? [];
  const chartVehicles = co2Data?.byVehicleType ?? [];
  const chartRoutes = co2Data?.topRoutes?.map(r => ({
    route: r.route,
    km: r.km,
    co2: r.co2,
    trips: r.trips,
  })) ?? [];
  const scopeBreakdown = co2Data?.scopeBreakdown ?? { scope1: 0, scope2: 0, scope3: 0 };

  const co2Compensatie = berekenCO2Compensatie(totalWtw);
  const benchmarkCo2 = totalKm > 0 ? totalKm * SECTOR_BENCHMARK_KG_PER_KM : 0;
  const esgVerschilPct = benchmarkCo2 > 0 ? Math.round(((totalEmissions - benchmarkCo2) / benchmarkCo2) * 100) : 0;
  const esgBeterDanSector = totalEmissions < benchmarkCo2;

  const scopeData = [
    { name: 'Scope 1', value: scopeBreakdown.scope1, color: '#22c55e', desc: 'Eigen vloot' },
    { name: 'Scope 2', value: scopeBreakdown.scope2, color: '#3b82f6', desc: 'Elektriciteit' },
    { name: 'Scope 3', value: scopeBreakdown.scope3, color: '#8b5cf6', desc: 'Uitbesteed' },
  ].filter(s => s.value > 0);

  const noData = !co2Loading && totalTrips === 0;

  return (
    <DashboardLayout title="CO2 Rapportage" description="GLEC Framework - Monitor en reduceer uw transport emissies">
      <div className="space-y-6">
        {/* Period Selector + GLEC Badge */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-2 items-center">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Maand</SelectItem>
                <SelectItem value="quarter">Kwartaal</SelectItem>
                <SelectItem value="year">Jaar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-emerald-600 border-emerald-500 gap-1 hidden sm:flex">
              <Shield className="h-3 w-3" />
              GLEC v3.0
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => co2Data && exportCO2CSV(co2Data, year)} disabled={!co2Data || totalTrips === 0}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => co2Data && exportCO2PDF(co2Data, year)} disabled={!co2Data || totalTrips === 0}>
              <FileText className="h-4 w-4 mr-2" />
              PDF Rapport
            </Button>
          </div>
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
            <div className="grid gap-4 md:grid-cols-5">
              <Card className="border-l-4 border-l-emerald-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">TTW Uitstoot</CardTitle>
                  <Leaf className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(totalEmissions / 1000).toFixed(1)} ton</div>
                  <p className="text-xs text-muted-foreground">Tank-to-Wheel</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">WTW Uitstoot</CardTitle>
                  <Layers className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(totalWtw / 1000).toFixed(1)} ton</div>
                  <p className="text-xs text-muted-foreground">Well-to-Wheel</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Per KM</CardTitle>
                  <Truck className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgWtwPerKm} kg</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {avgPerKm > 0 && avgPerKm < SECTOR_BENCHMARK_KG_PER_KM ? (
                      <><TrendingDown className="h-3 w-3 mr-1 text-emerald-500" /><span>Onder benchmark</span></>
                    ) : avgPerKm > 0 ? (
                      <><TrendingUp className="h-3 w-3 mr-1 text-red-500" /><span>Boven benchmark</span></>
                    ) : <span>-</span>}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-violet-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Compensatie</CardTitle>
                  <Euro className="h-4 w-4 text-violet-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">EUR{co2Compensatie.toFixed(0)}</div>
                  <p className="text-xs text-muted-foreground">EUR15/ton</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-rose-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ritten / KM</CardTitle>
                  <Route className="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTrips}</div>
                  <p className="text-xs text-muted-foreground">{totalKm.toLocaleString('nl-NL')} km</p>
                </CardContent>
              </Card>
            </div>

            {/* GHG Scope Breakdown */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-base">GHG Protocol - Scope Uitsplitsing</CardTitle>
                  </div>
                  <CardDescription>Well-to-Wheel emissies per GHG Protocol scope</CardDescription>
                </CardHeader>
                <CardContent>
                  {scopeData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Geen data</p>
                  ) : (
                    <div className="space-y-4">
                      {scopeData.map(s => {
                        const totalScope = scopeBreakdown.scope1 + scopeBreakdown.scope2 + scopeBreakdown.scope3;
                        const pct = totalScope > 0 ? Math.round((s.value / totalScope) * 100) : 0;
                        return (
                          <div key={s.name} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                {s.name} <span className="text-muted-foreground">({s.desc})</span>
                              </span>
                              <span className="font-medium">{(s.value / 1000).toFixed(1)} ton ({pct}%)</span>
                            </div>
                            <Progress value={pct} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-base">ESG Benchmark</CardTitle>
                  </div>
                  <CardDescription>Vergelijking met sector ({SECTOR_BENCHMARK_KG_PER_KM} kg/km)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Eigen uitstoot (TTW/km)</span>
                    <span className="font-medium">{totalKm > 0 ? (totalEmissions / totalKm).toFixed(2) : '-'} kg</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Eigen uitstoot (WTW/km)</span>
                    <span className="font-medium">{avgWtwPerKm} kg</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t pt-2">
                    <span className="font-medium">Verschil vs sector</span>
                    {totalKm > 0 ? (
                      <Badge variant="outline" className={esgBeterDanSector ? 'text-emerald-600 border-emerald-500' : 'text-red-600 border-red-500'}>
                        {esgBeterDanSector ? 'v' : '^'} {Math.abs(esgVerschilPct)}% {esgBeterDanSector ? 'beter' : 'slechter'}
                      </Badge>
                    ) : <span className="text-muted-foreground">-</span>}
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
            </div>

            {/* Charts */}
            <Tabs defaultValue="trend" className="space-y-4">
              <TabsList>
                <TabsTrigger value="trend">Trend (TTW vs WTW)</TabsTrigger>
                <TabsTrigger value="fleet">Vloot Verdeling</TabsTrigger>
                <TabsTrigger value="routes">Route Efficientie</TabsTrigger>
              </TabsList>

              <TabsContent value="trend">
                <Card>
                  <CardHeader>
                    <CardTitle>Maandelijkse CO2 Uitstoot</CardTitle>
                    <CardDescription>Tank-to-Wheel vs Well-to-Wheel per maand</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chartMonthly.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Geen maanddata beschikbaar</p>
                    ) : (
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartMonthly}>
                            <defs>
                              <linearGradient id="colorTtw" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorWtw" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                              formatter={(value: number, name: string) => [`${value.toLocaleString('nl-NL')} kg`, name]}
                            />
                            <Legend />
                            <Area type="monotone" dataKey="co2" name="TTW (kg)" stroke="#22c55e" fillOpacity={1} fill="url(#colorTtw)" />
                            <Area type="monotone" dataKey="wtw" name="WTW (kg)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWtw)" />
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
                              <Pie data={chartVehicles} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
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
                      <CardDescription>TTW vs WTW per categorie</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {chartVehicles.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Geen data</p>
                      ) : (
                        <div className="space-y-4">
                          {chartVehicles.map((item) => {
                            const totalTripsV = chartVehicles.reduce((s, v) => s + v.value, 0);
                            const pct = totalTripsV > 0 ? Math.round((item.value / totalTripsV) * 100) : 0;
                            return (
                              <div key={item.name} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    {item.name}
                                  </span>
                                  <span className="font-medium">{pct}% | TTW {item.co2}kg | WTW {item.wtw}kg</span>
                                </div>
                                <Progress value={pct} className="h-2" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="routes">
                <Card>
                  <CardHeader>
                    <CardTitle>Route Efficientie Analyse</CardTitle>
                    <CardDescription>CO2 uitstoot per populaire route (gemiddeld per rit)</CardDescription>
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
                              <th className="text-right py-3 px-4 font-medium">Gem. CO2 (kg)</th>
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
                                  {route.km > 0 ? (route.co2 / route.km).toFixed(2) : '-'}
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

            {/* GLEC Compliance Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-500" />
                  <CardTitle className="text-base">GLEC Framework v3.0 Compliance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Dit rapport voldoet aan het <strong>Global Logistics Emissions Council (GLEC) Framework v3.0</strong> voor de berekening en rapportage van logistieke emissies.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-foreground">Well-to-Wheel</p>
                    <p className="text-xs">Volledige keten inclusief brandstofproductie en -distributie</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-foreground">GHG Protocol</p>
                    <p className="text-xs">Scope 1/2/3 uitsplitsing conform ISO 14064</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-foreground">EU Regelgeving 2026</p>
                    <p className="text-xs">Voldoet aan CountEmissions EU verordening</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CO2Reporting;
