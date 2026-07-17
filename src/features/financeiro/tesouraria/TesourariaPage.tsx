import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload, RefreshCw, ArrowRightLeft, Wallet, TrendingUp, TrendingDown, Undo2 } from "lucide-react";
import { useFinancialAccounts } from "../cadastros/useFinancialRegisters";
import {
  useAccountBalances,
  useBankTransactions,
  useImportBankStatement,
  useAutoReconcile,
  useTransfers,
  useCreateTransfer,
  useCancelTransfer,
  useImportBatches,
} from "./useTesouraria";

const BRL = (v: number) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function TesourariaPage() {
  const [horizon, setHorizon] = useState(30);
  const { data: accounts = [] } = useFinancialAccounts();
  const { data: balances = [], isLoading: loadingBalances } = useAccountBalances(horizon);
  const [accountId, setAccountId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const { data: txs = [], isLoading: loadingTxs } = useBankTransactions(accountId || null, statusFilter);
  const { data: transfers = [] } = useTransfers();
  const { data: batches = [] } = useImportBatches(accountId || null);

  const importMut = useImportBankStatement();
  const autoMut = useAutoReconcile();
  const transferMut = useCreateTransfer();
  const cancelTransferMut = useCancelTransfer();

  const [importDialog, setImportDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{ id: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tesouraria</h1>
          <p className="text-muted-foreground">Saldos, extratos, conciliação e transferências</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Horizonte:</Label>
          <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Saldos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loadingBalances && <p className="text-sm text-muted-foreground">Carregando saldos…</p>}
        {balances.map((b) => (
          <Card key={b.account_id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4" />
                {b.account_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Saldo atual</span><span className="font-semibold">{BRL(b.current_balance)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Saldo conciliado</span><span>{BRL(b.reconciled_balance)}</span></div>
              <div className="flex justify-between"><span className="text-emerald-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" />A receber</span><span className="text-emerald-600">{BRL(b.pending_in)}</span></div>
              <div className="flex justify-between"><span className="text-rose-600 flex items-center gap-1"><TrendingDown className="h-3 w-3" />A pagar</span><span className="text-rose-600">{BRL(b.pending_out)}</span></div>
              <div className="mt-2 flex justify-between border-t pt-2">
                <span className="font-medium">Projetado ({horizon}d)</span>
                <span className="font-bold">{BRL(b.projected_balance)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="extrato" className="space-y-4">
        <TabsList>
          <TabsTrigger value="extrato">Extrato e Conciliação</TabsTrigger>
          <TabsTrigger value="transferencias">Transferências</TabsTrigger>
          <TabsTrigger value="importacoes">Importações</TabsTrigger>
        </TabsList>

        {/* Extrato */}
        <TabsContent value="extrato" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-end gap-3 space-y-0">
              <div className="flex-1 min-w-[200px]">
                <Label>Conta</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a) => a.active).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendentes</SelectItem>
                    <SelectItem value="PARTIALLY_RECONCILED">Parciais</SelectItem>
                    <SelectItem value="RECONCILED">Conciliadas</SelectItem>
                    <SelectItem value="IGNORED">Ignoradas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => setImportDialog(true)} disabled={!accountId}>
                <Upload className="mr-2 h-4 w-4" /> Importar extrato
              </Button>
              <Button
                onClick={() => accountId && autoMut.mutate({ account_id: accountId })}
                disabled={!accountId || autoMut.isPending}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Conciliar automaticamente
              </Button>
            </CardHeader>
            <CardContent>
              {!accountId ? (
                <p className="text-sm text-muted-foreground">Selecione uma conta para ver o extrato.</p>
              ) : loadingTxs ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : txs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma transação.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Doc.</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Conciliado</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txs.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell>{new Date(t.transaction_date).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="max-w-[300px] truncate" title={t.description}>{t.description || t.memo || "—"}</TableCell>
                        <TableCell>{t.document_number || "—"}</TableCell>
                        <TableCell className={`text-right ${t.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {BRL(Number(t.amount))}
                        </TableCell>
                        <TableCell className="text-right">{BRL(Number(t.reconciled_amount))}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === "RECONCILED" ? "default" : t.status === "PARTIALLY_RECONCILED" ? "secondary" : "outline"}>
                            {t.status === "RECONCILED" ? "Conciliada" : t.status === "PARTIALLY_RECONCILED" ? "Parcial" : t.status === "IGNORED" ? "Ignorada" : "Pendente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transferências */}
        <TabsContent value="transferencias" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setTransferDialog(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Nova transferência
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {transfers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma transferência registrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>De</TableHead>
                      <TableHead>Para</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell>{new Date(t.transfer_date).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>{t.source?.name || "—"}</TableCell>
                        <TableCell>{t.destination?.name || "—"}</TableCell>
                        <TableCell className="text-right">{BRL(Number(t.amount))}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === "COMPLETED" ? "default" : "outline"}>
                            {t.status === "COMPLETED" ? "Concluída" : t.status === "CANCELED" ? "Cancelada" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {t.status === "COMPLETED" && (
                            <Button size="sm" variant="ghost" onClick={() => { setCancelDialog({ id: t.id }); setCancelReason(""); }}>
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Importações */}
        <TabsContent value="importacoes">
          <Card>
            <CardContent className="pt-6">
              {batches.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma importação registrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Formato</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Novas</TableHead>
                      <TableHead className="text-right">Dupl.</TableHead>
                      <TableHead className="text-right">Falhas</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell className="max-w-[250px] truncate">{b.file_name}</TableCell>
                        <TableCell>{b.file_format}</TableCell>
                        <TableCell className="text-xs">
                          {b.period_start ? `${new Date(b.period_start).toLocaleDateString("pt-BR")} – ${new Date(b.period_end).toLocaleDateString("pt-BR")}` : "—"}
                        </TableCell>
                        <TableCell className="text-right">{b.total_rows}</TableCell>
                        <TableCell className="text-right text-emerald-600">{b.imported_rows}</TableCell>
                        <TableCell className="text-right text-amber-600">{b.duplicate_rows}</TableCell>
                        <TableCell className="text-right text-rose-600">{b.failed_rows}</TableCell>
                        <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ImportDialog
        open={importDialog}
        onOpenChange={setImportDialog}
        accountId={accountId}
        onImport={(file, format) =>
          importMut.mutate({ account_id: accountId, file, format }, { onSuccess: () => setImportDialog(false) })
        }
        isPending={importMut.isPending}
      />

      <TransferDialog
        open={transferDialog}
        onOpenChange={setTransferDialog}
        accounts={accounts.filter((a) => a.active)}
        onSubmit={(payload) => transferMut.mutate(payload, { onSuccess: () => setTransferDialog(false) })}
        isPending={transferMut.isPending}
      />

      <Dialog open={!!cancelDialog} onOpenChange={(o) => !o && setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar transferência</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Justificativa (obrigatória)</Label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={cancelReason.trim().length < 5 || cancelTransferMut.isPending}
              onClick={() => cancelDialog && cancelTransferMut.mutate(
                { transfer_id: cancelDialog.id, reason: cancelReason },
                { onSuccess: () => setCancelDialog(null) }
              )}
            >
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ImportDialog({
  open, onOpenChange, accountId, onImport, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId: string;
  onImport: (file: File, format: "OFX" | "CSV") => void;
  isPending: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"OFX" | "CSV">("OFX");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Importar extrato bancário</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Formato</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OFX">OFX</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Arquivo</Label>
            <Input
              type="file"
              accept={format === "OFX" ? ".ofx,text/xml" : ".csv,text/csv"}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Transações duplicadas são detectadas automaticamente pelo hash (conta + data + valor + FITID/memo).
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!file || !accountId || isPending} onClick={() => file && onImport(file, format)}>
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({
  open, onOpenChange, accounts, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: any[];
  onSubmit: (p: any) => void;
  isPending: boolean;
}) {
  const [src, setSrc] = useState("");
  const [dst, setDst] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [desc, setDesc] = useState("");
  const valid = src && dst && src !== dst && Number(amount) > 0 && date;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova transferência entre contas</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Conta de origem</Label>
            <Select value={src} onValueChange={setSrc}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Conta de destino</Label>
            <Select value={dst} onValueChange={setDst}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {accounts.filter((a) => a.id !== src).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!valid || isPending}
            onClick={() => onSubmit({
              source_account_id: src,
              destination_account_id: dst,
              amount: Number(amount),
              transfer_date: date,
              description: desc || undefined,
            })}
          >
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
