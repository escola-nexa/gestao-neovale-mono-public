import { Student } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { GraduationCap, Pencil, Trash2 } from 'lucide-react';

interface StudentTableProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onViewEnrollments: (student: Student) => void;
  showSchoolColumn?: boolean;
}

export function StudentTable({ students, onEdit, onDelete, onViewEnrollments, showSchoolColumn }: StudentTableProps) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matrícula</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Data Nasc.</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-mono">{student.codigoMatricula}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{student.nomeCompleto}</span>
                    {student.educacaoEspecial && (
                      <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700">
                        Educação Especial
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{student.cpf || '—'}</TableCell>
                <TableCell>
                  {student.dataNascimento ? new Date(student.dataNascimento).toLocaleDateString('pt-BR') : '—'}
                </TableCell>
                <TableCell>{student.whatsapp}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell>
                  <Badge variant={student.status === 'ativo' ? 'default' : 'secondary'}>
                    {student.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onViewEnrollments(student)} title="Ver Matrículas">
                      <GraduationCap className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(student)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(student.id)} title="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum aluno encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile/Tablet Cards */}
      <div className="lg:hidden divide-y">
        {students.map((student) => (
          <div key={student.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{student.nomeCompleto}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs font-mono">{student.codigoMatricula}</Badge>
                  <Badge variant={student.status === 'ativo' ? 'default' : 'secondary'} className="text-xs">
                    {student.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {student.educacaoEspecial && (
                    <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700">
                      Educação Especial
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {student.cpf && <p>CPF: <span className="font-mono">{student.cpf}</span></p>}
              {student.dataNascimento && <p>Nasc: {new Date(student.dataNascimento).toLocaleDateString('pt-BR')}</p>}
              <p className="truncate">{student.email}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onViewEnrollments(student)}>
                <GraduationCap className="mr-2 h-4 w-4" /> Matrículas
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(student)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(student.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {students.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum aluno encontrado
          </div>
        )}
      </div>
    </>
  );
}
