import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Coins, Star } from "lucide-react";
import { getCurrenciesForSettings, createCurrency, setDefaultCurrency } from "./actions";

export default async function SettingsCurrenciesPage() {
  const currencies = await getCurrenciesForSettings();

  async function setDefault(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (!id) return;
    await setDefaultCurrency(id);
  }

  async function submitCreateCurrency(formData: FormData) {
    "use server";
    await createCurrency(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Currencies
        </h1>
        <p className="text-muted-foreground">
          Manage organization currencies and default currency
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Available currencies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No currencies configured yet. Add at least one currency (e.g. AED, USD).
            </p>
          ) : (
            <div className="rounded-md border divide-y">
              {currencies.map((cur) => (
                <div
                  key={cur.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cur.code}</span>
                      {cur.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          <Star className="h-3 w-3 fill-primary" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {cur.name}
                      {cur.symbol ? ` • ${cur.symbol}` : ""}
                    </p>
                  </div>
                  {!cur.isDefault && (
                    <form action={setDefault}>
                      <input type="hidden" name="id" value={cur.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Make default
                      </Button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add currency</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submitCreateCurrency} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="code">
                Code *
              </label>
              <input
                id="code"
                name="code"
                required
                placeholder="AED"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="name">
                Name *
              </label>
              <input
                id="name"
                name="name"
                required
                placeholder="UAE Dirham"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="symbol">
                Symbol
              </label>
              <input
                id="symbol"
                name="symbol"
                placeholder="د.إ or $"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">Add currency</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

