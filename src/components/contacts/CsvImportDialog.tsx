import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle2,
  AlertTriangle, XCircle, Loader2, Download,
} from "lucide-react";

type Step = "upload" | "mapping" | "preview" | "importing" | "report";

interface ParsedRow {
  [key: string]: string;
}

interface MappedContact {
  name: string;
  email: string;
  phone: string;
  company_name: string;
  origin: string;
  tags: string;
  store_name: string;
  _raw: ParsedRow;
  _valid: boolean;
  _error?: string;
  _duplicate?: boolean;
}

interface ImportReport {
  total: number;
  imported: number;
  duplicates: number;
  invalid: number;
  errors: { row: number; email: string; reason: string }[];
}

const SYSTEM_FIELDS = [
  { key: "name", label: "Nome" },
  { key: "email", label: "Email *" },
  { key: "phone", label: "Telefone" },
  { key: "company_name", label: "Empresa" },
  { key: "origin", label: "Origem" },
  { key: "tags", label: "Tags (separar por vírgula)" },
  { key: "store_name", label: "Loja" },
  { key: "__ignore", label: "— Ignorar —" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CsvImportDialog({ open, onOpenChange }: Props) {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappedData, setMappedData] = useState<MappedContact[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setMappedData([]);
    setReport(null);
    setProgress(0);
    setFileName("");
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  // Step 1: Upload
  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields || [];
        const rows = result.data as ParsedRow[];
        setCsvHeaders(headers);
        setCsvRows(rows);

        // Auto-map columns by name similarity
        const autoMap: Record<string, string> = {};
        headers.forEach((h) => {
          const lower = h.toLowerCase().trim();
          if (lower.includes("nome") || lower.includes("name")) autoMap[h] = "name";
          else if (lower.includes("email") || lower.includes("e-mail")) autoMap[h] = "email";
          else if (lower.includes("telefone") || lower.includes("phone") || lower.includes("cel")) autoMap[h] = "phone";
          else if (lower.includes("empresa") || lower.includes("company")) autoMap[h] = "company_name";
          else if (lower.includes("origem") || lower.includes("origin") || lower.includes("source")) autoMap[h] = "origin";
          else if (lower.includes("tag")) autoMap[h] = "tags";
          else if (lower.includes("loja") || lower.includes("store") || lower.includes("unidade")) autoMap[h] = "store_name";
          else autoMap[h] = "__ignore";
        });
        setMapping(autoMap);
        setStep("mapping");
      },
      error: () => {
        // Handle error silently
      },
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx"))) {
      handleFile(file);
    }
  }, [handleFile]);

  // Step 2 → Step 3: Apply mapping + validate
  const applyMapping = () => {
    const emailCol = Object.entries(mapping).find(([, v]) => v === "email")?.[0];
    if (!emailCol) return;

    const seenEmails = new Set<string>();
    const mapped: MappedContact[] = csvRows.map((row) => {
      const contact: MappedContact = {
        name: "", email: "", phone: "", company_name: "", origin: "", tags: "", store_name: "",
        _raw: row, _valid: true,
      };

      Object.entries(mapping).forEach(([csvCol, sysField]) => {
        if (sysField !== "__ignore" && sysField in contact) {
          (contact as any)[sysField] = (row[csvCol] || "").trim();
        }
      });

      // Validate email
      if (!contact.email) {
        contact._valid = false;
        contact._error = "Email vazio";
      } else if (!EMAIL_REGEX.test(contact.email)) {
        contact._valid = false;
        contact._error = "Email inválido";
      } else if (seenEmails.has(contact.email.toLowerCase())) {
        contact._duplicate = true;
        contact._valid = false;
        contact._error = "Duplicado no arquivo";
      }
      seenEmails.add(contact.email.toLowerCase());
      return contact;
    });

    setMappedData(mapped);
    setStep("preview");
  };

  // Step 3 → Step 4: Import
  const startImport = async () => {
    if (!companyId) return;
    setStep("importing");
    const valid = mappedData.filter((c) => c._valid);
    const totalToImport = valid.length;
    let imported = 0;
    let duplicates = mappedData.filter((c) => c._duplicate).length;
    let invalid = mappedData.filter((c) => !c._valid && !c._duplicate).length;
    const errors: ImportReport["errors"] = [];

    // Resolve store names to IDs
    const uniqueStoreNames = [...new Set(valid.map((c) => c.store_name?.trim()).filter(Boolean))];
    const storeIdMap: Record<string, string> = {};
    for (const storeName of uniqueStoreNames) {
      const { data: store } = await supabase
        .from("stores")
        .upsert({ company_id: companyId, name: storeName }, { onConflict: "company_id,name" })
        .select("id")
        .single();
      if (store) storeIdMap[storeName.toLowerCase()] = store.id;
    }

    // Batch insert in chunks of 500 for better throughput
    const batchSize = 500;
    for (let i = 0; i < valid.length; i += batchSize) {
      const batch = valid.slice(i, i + batchSize).map((c) => ({
        company_id: companyId,
        name: c.name || null,
        email: c.email,
        phone: c.phone || null,
        company_name: c.company_name || null,
        origin: c.origin || "Importação CSV",
        store_id: c.store_name?.trim() ? storeIdMap[c.store_name.trim().toLowerCase()] || null : null,
      }));

      try {
        const { error, data } = await supabase.from("contacts").upsert(batch, {
          onConflict: "company_id,email",
          ignoreDuplicates: true,
        }).select("id");

        if (error) {
          // On error, try smaller chunks to isolate problematic rows
          const smallBatch = 50;
          for (let j = 0; j < batch.length; j += smallBatch) {
            const subBatch = batch.slice(j, j + smallBatch);
            const { error: subError, data: subData } = await supabase.from("contacts").upsert(subBatch, {
              onConflict: "company_id,email",
              ignoreDuplicates: true,
            }).select("id");

            if (subError) {
              subBatch.forEach((b, idx) => {
                errors.push({ row: i + j + idx + 2, email: b.email, reason: subError.message });
              });
            } else {
              imported += subData?.length || 0;
              duplicates += subBatch.length - (subData?.length || 0);
            }
          }
        } else {
          imported += data?.length || 0;
          const skipped = batch.length - (data?.length || 0);
          duplicates += skipped;
        }
      } catch (err: any) {
        batch.forEach((b, idx) => {
          errors.push({ row: i + idx + 2, email: b.email, reason: err.message || "Erro desconhecido" });
        });
      }

      setProgress(Math.min(100, Math.round(((i + batchSize) / totalToImport) * 100)));

      // Yield to UI every 2000 contacts
      if (i % 2000 === 0 && i > 0) {
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    // Handle tags for imported contacts (process in background)
    const contactsWithTags = valid.filter((c) => c.tags?.trim());
    if (contactsWithTags.length > 0) {
      // Process tags in small batches to avoid blocking
      for (let i = 0; i < contactsWithTags.length; i += 100) {
        const tagBatch = contactsWithTags.slice(i, i + 100);
        for (const c of tagBatch) {
          const tags = c.tags.split(",").map((t) => t.trim()).filter(Boolean);
          if (tags.length === 0) continue;

          // Get contact id
          const { data: contact } = await supabase
            .from("contacts")
            .select("id")
            .eq("company_id", companyId)
            .eq("email", c.email)
            .single();

          if (!contact) continue;

          for (const tagName of tags) {
            // Upsert tag
            const { data: tag } = await supabase
              .from("tags")
              .upsert({ company_id: companyId, name: tagName }, { onConflict: "company_id,name" })
              .select("id")
              .single();

            if (tag) {
              await supabase.from("contact_tags").upsert(
                { contact_id: contact.id, tag_id: tag.id },
                { onConflict: "contact_id,tag_id" }
              );
            }
          }
        }
      }
    }

    setReport({
      total: mappedData.length,
      imported,
      duplicates,
      invalid,
      errors: errors.slice(0, 100), // Limit error display
    });
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    setStep("report");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Contatos
          </DialogTitle>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-6">
          {(["upload", "mapping", "preview", "report"] as const).map((s, i) => {
            const labels = ["Upload", "Mapeamento", "Preview", "Relatório"];
            const isActive = ["upload", "mapping", "preview", "importing", "report"].indexOf(step) >= i;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {labels[i]}
                </span>
                {i < 3 && <div className={`flex-1 h-px ${isActive ? "bg-primary" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="font-medium mb-1">Arraste seu arquivo CSV aqui</p>
            <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-3">Formatos aceitos: .CSV</p>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && (
          <div>
            <div className="bg-muted/50 rounded-lg p-3 mb-4">
              <p className="text-sm"><span className="font-medium">{fileName}</span> — {csvRows.length} linhas, {csvHeaders.length} colunas</p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Mapeie as colunas do seu arquivo para os campos do sistema:</p>
            <div className="space-y-3">
              {csvHeaders.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{header}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      ex: {csvRows[0]?.[header] || "-"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select value={mapping[header] || "__ignore"} onValueChange={(v) => setMapping({ ...mapping, [header]: v })}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SYSTEM_FIELDS.map((f) => (
                        <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {!Object.values(mapping).includes("email") && (
              <p className="text-sm text-destructive mt-3 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Mapeie pelo menos a coluna de Email
              </p>
            )}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep("upload")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
              <Button onClick={applyMapping} disabled={!Object.values(mapping).includes("email")} className="gap-2">Continuar <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{mappedData.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: "hsl(var(--success) / 0.1)" }}>
                <p className="text-2xl font-bold text-success">{mappedData.filter((c) => c._valid).length}</p>
                <p className="text-xs text-muted-foreground">Válidos</p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: "hsl(var(--destructive) / 0.1)" }}>
                <p className="text-2xl font-bold text-destructive">{mappedData.filter((c) => !c._valid).length}</p>
                <p className="text-xs text-muted-foreground">Inválidos/Duplicados</p>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="data-table">
                <thead className="sticky top-0 bg-card">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Nome</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Telefone</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedData.slice(0, 100).map((c, i) => (
                    <tr key={i} className={`border-t border-border ${!c._valid ? "bg-destructive/5" : ""}`}>
                      <td className="px-3 py-2">
                        {c._valid ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">{c.name || "-"}</td>
                      <td className="px-3 py-2 text-sm">{c.email || "-"}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{c.phone || "-"}</td>
                      <td className="px-3 py-2 text-xs text-destructive">{c._error || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mappedData.length > 100 && (
                <p className="px-3 py-2 text-xs text-muted-foreground text-center">Mostrando 100 de {mappedData.length} linhas</p>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep("mapping")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
              <Button
                onClick={startImport}
                disabled={mappedData.filter((c) => c._valid).length === 0}
                className="gap-2"
              >
                Importar {mappedData.filter((c) => c._valid).length} contatos <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="font-medium mb-3">Importando contatos...</p>
            <Progress value={progress} className="max-w-xs mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
          </div>
        )}

        {/* Step 5: Report */}
        {step === "report" && report && (
          <div>
            <div className="text-center mb-6">
              <CheckCircle2 className="h-14 w-14 mx-auto mb-3 text-success" />
              <h3 className="text-lg font-bold">Importação concluída!</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-xl font-bold">{report.total}</p>
                <p className="text-xs text-muted-foreground">Total no arquivo</p>
              </div>
              <div className="rounded-lg p-4 text-center" style={{ background: "hsl(var(--success) / 0.1)" }}>
                <p className="text-xl font-bold text-success">{report.imported}</p>
                <p className="text-xs text-muted-foreground">Importados</p>
              </div>
              <div className="rounded-lg p-4 text-center" style={{ background: "hsl(var(--warning) / 0.1)" }}>
                <p className="text-xl font-bold text-warning">{report.duplicates}</p>
                <p className="text-xs text-muted-foreground">Duplicados</p>
              </div>
              <div className="rounded-lg p-4 text-center" style={{ background: "hsl(var(--destructive) / 0.1)" }}>
                <p className="text-xl font-bold text-destructive">{report.invalid}</p>
                <p className="text-xs text-muted-foreground">Inválidos</p>
              </div>
            </div>

            {report.errors.length > 0 && (
              <div className="rounded-lg border border-border mb-4 max-h-[200px] overflow-y-auto">
                <table className="data-table">
                  <thead className="sticky top-0 bg-card">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Linha</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.errors.map((e, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 text-sm">{e.row}</td>
                        <td className="px-3 py-2 text-sm">{e.email}</td>
                        <td className="px-3 py-2 text-xs text-destructive">{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-center">
              <Button onClick={() => handleClose(false)} className="gap-2">
                <CheckCircle2 className="h-4 w-4" /> Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
