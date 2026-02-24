
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MUN_ID = 'sao-jose-do-rio-preto';

function categorizeExpense(orgao: string, supplier: string = '', description: string = ''): string {
    const text = `${orgao} ${supplier} ${description}`.toUpperCase();
    if (text.includes('SAUDE') || text.includes('SAÚDE') || text.includes('MEDIC') || text.includes('HOSPITAL') || text.includes('FARMAC')) return 'Saúde';
    if (text.includes('EDUCACAO') || text.includes('EDUCAÇÃO') || text.includes('ESCOLA') || text.includes('CRECHE') || text.includes('ENSINO') || text.includes('PEDAGOG')) return 'Educação';
    if (text.includes('ALIMENT') || text.includes('MERENDA') || text.includes('COMIDA') || text.includes('CEASA')) return 'Alimentação';
    if (text.includes('CONSTRUTORA') || text.includes('OBRAS') || text.includes('REFORMA') || text.includes(' ASFAL') || text.includes('SINALIZAC')) return 'Infraestrutura/Obras';
    if (text.includes('TRANS') || text.includes('COMBUSTIVEL') || text.includes('POSTO ') || text.includes('PNEU') || text.includes('CIRCULAR')) return 'Transporte';
    if (text.includes('SEGURANCA') || text.includes('GUARDA') || text.includes('POLICI') || text.includes('VIGILANC')) return 'Segurança';
    if (text.includes('ASSISTENCIA') || text.includes('SOCIAL') || text.includes('CRAS') || text.includes('POBREZA')) return 'Assistência Social';
    if (text.includes('CULTURA') || text.includes('TEATRO') || text.includes('MUSEU') || text.includes('BIBLIOTECA')) return 'Cultura';
    if (text.includes('PESSOAL') || text.includes('SALARIO') || text.includes('PROVENTOS') || text.includes('PREVIDENCIA') || text.includes('IPRP')) return 'Pessoal/RH';
    if (text.includes('LIMPEZA') || text.includes('LIXO') || text.includes('VARRECAO') || text.includes('URBANA')) return 'Limpeza Urbana';
    if (text.includes('REPRESENTATIVO') || text.includes('PARLAMENTAR') || text.includes('CAMARA') || text.includes('VEREADOR')) return 'Legislativo';
    if (text.includes('TI') || text.includes('TECNOLOGIA') || text.includes('SOFTWARE') || text.includes('INFORMATICA')) return 'Tecnologia';
    if (text.includes('AGUA') || text.includes('ESGOTO') || text.includes('SEMAE') || text.includes('SANEAMENTO')) return 'Saneamento';
    return 'Geral';
}

async function recover() {
    const year = 2026;
    const month = 1;
    const url = `https://transparencia.tce.sp.gov.br/api/json/despesas/${MUN_ID}/${year}/${month}`;

    console.log(`📡 Fetching recovery data for Jan 2026: ${url}`);

    try {
        const response = await axios.get(url, { timeout: 60000 });
        const data = response.data;

        if (!Array.isArray(data)) {
            console.log('❌ Invalid response format or no data.');
            return;
        }

        console.log(`✅ Success! Received ${data.length} records. Processing...`);

        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const records = batch.map((item: any) => {
                const cleanAmount = parseFloat(item.vl_despesa.replace(/\./g, '').replace(',', '.'));
                const [day, m, y] = item.dt_emissao_despesa.split('/');
                return {
                    date: `${y}-${m}-${day}`,
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
            if (error) console.error('❌ Error saving batch:', error.message);
            else process.stdout.write('.');
        }
        console.log('\n🏁 Recovery of Jan 2026 finished!');
    } catch (e: any) {
        console.error('❌ Recovery failed:', e.message);
    }
}

recover();
