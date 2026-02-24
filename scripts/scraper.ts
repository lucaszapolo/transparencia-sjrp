import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });
// If not found in .env.local, dotenv will just skip, process.env will already have vars from GH Actions

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MUN_ID = 'sao-jose-do-rio-preto';

// Mapa de categorização inteligente baseada no órgão, fornecedor e descrição
function categorizeExpense(orgao: string, supplier: string = '', description: string = ''): string {
  const text = `${orgao} ${supplier} ${description}`.toUpperCase();

  // Ordem de prioridade (mais específico para mais geral)
  if (text.includes('SAUDE') || text.includes('SAÚDE') || text.includes('MEDIC') || text.includes('HOSPITAL') || text.includes('FARMAC')) return 'Saúde';
  if (text.includes('EDUCACAO') || text.includes('EDUCAÇÃO') || text.includes('ESCOLA') || text.includes('CRECHE') || text.includes('ENSINO') || text.includes('PEDAGOG')) return 'Educação';
  if (text.includes('OBRAS') || text.includes('CONSTRUCO') || text.includes('CONSTRUÇÃO') || text.includes('REFORMA') || text.includes('PAVIMENT')) return 'Obras';
  if (text.includes('ASSISTENCIA') || text.includes('ASSISTÊNCIA') || text.includes('SOCIAL') || text.includes('SOLIDARI')) return 'Assistência Social';
  if (text.includes('SEGURANCA') || text.includes('SEGURANÇA') || text.includes('GUARDA') || text.includes('POLIC')) return 'Segurança';
  if (text.includes('TRANSPORTE') || text.includes('ONIBUS') || text.includes('ÔNIBUS') || text.includes('TRANSITO') || text.includes('TRÂNSITO') || text.includes('VEICULO') || text.includes('FROTA')) return 'Transporte';
  if (text.includes('CULTURA') || text.includes('SHOW') || text.includes('TEATRO') || text.includes('MUSICA')) return 'Cultura';
  if (text.includes('ESPORTE') || text.includes('LAZER') || text.includes('ESTADIO') || text.includes('GINASIO')) return 'Esporte';
  if (text.includes('MEIO AMBIENTE') || text.includes('ECOLOGIA') || text.includes('VERDE') || text.includes('LIMPEZA URBANA')) return 'Meio Ambiente';
  if (text.includes('TURISMO') || text.includes('VIAGENS')) return 'Turismo';
  if (text.includes('ADMINISTRACAO') || text.includes('ADMINISTRAÇÃO') || text.includes('PREVIDENCIA') || text.includes('IPREM') || text.includes('FOLHA') || text.includes('SALARIO')) return 'Administração';
  if (text.includes('REPRESENTATIVO') || text.includes('PARLAMENTAR') || text.includes('CAMARA') || text.includes('VEREADOR')) return 'Legislativo';
  if (text.includes('TI ') || text.includes('TECNOLOGIA') || text.includes('SOFTWARE') || text.includes('INFORMATICA')) return 'Tecnologia';
  if (text.includes('AGUA') || text.includes('ESGOTO') || text.includes('SEMAE') || text.includes('SANEAMENTO')) return 'Saneamento';
  if (text.includes('PESSOAL') || text.includes('VENCIMENTOS') || text.includes('ENCARGOS') || text.includes('FOLHA DE PAG') || text.includes('COORDENADORIA DE PESSOAL')) return 'Administração';

  return 'Geral';
}

async function ingestData() {
  const years = [2024, 2025, 2026];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  console.log('🚀 Iniciando Ingestão Massiva via API TCESP...');

  for (const year of years) {
    for (const month of months) {
      // Pular meses futuros de 2026
      if (year === 2026 && month > 2) continue; // Estamos em Fevereiro de 2026

      console.log(`\n📅 Processando: ${month}/${year}...`);
      const url = `https://transparencia.tce.sp.gov.br/api/json/despesas/${MUN_ID}/${year}/${month}`;

      try {
        const response = await axios.get(url, { timeout: 30000 });
        const data = response.data;

        if (!Array.isArray(data) || data.length === 0) {
          console.log(`⚠️ Sem dados ou resposta vazia para ${month}/${year} (Pode ser atraso na publicação do TCESP)`);
          continue;
        }

        console.log(`📊 Recebidos ${data.length} registros. Fazendo upsert...`);

        // Batch processing para não sobrecarregar
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);

          const records = batch.map((item: any) => {
            const cleanAmount = parseFloat(item.vl_despesa.replace(/\./g, '').replace(',', '.'));
            const [day, m, y] = item.dt_emissao_despesa.split('/');
            const isoDate = `${y}-${m}-${day}`;

            return {
              date: isoDate,
              amount: cleanAmount,
              description: item.evento + ': ' + (item.desc_empenho || 'Despesa registrada'),
              category: categorizeExpense(item.orgao, item.nm_fornecedor, item.desc_empenho),
              supplier_name: item.nm_fornecedor,
              document_number: item.nr_empenho,
              year: year,
              month: month,
              source_url: url
            };
          });

          const { error } = await supabase.from('expenses').upsert(records, { onConflict: 'document_number' });

          if (error) {
            console.error(`❌ Erro no batched upsert em ${month}/${year}:`, error.message);
          } else {
            process.stdout.write('.'); // Progresso visual
          }
        }

        console.log(`\n✅ ${month}/${year} concluído.`);

      } catch (error: any) {
        console.error(`\n❌ Falha grave em ${month}/${year}:`, error.message);
      }
    }
  }

  console.log('\n\n🏁 Ingestão Massiva Finalizada com Sucesso!');
}

ingestData();
