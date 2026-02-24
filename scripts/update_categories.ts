import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Copied logic from scraper.ts
function categorizeExpense(orgao: string = '', supplier: string = '', description: string = ''): string {
    const text = `${orgao} ${supplier} ${description}`.toUpperCase();

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
    if (text.includes('TI') || text.includes('TECNOLOGIA') || text.includes('SOFTWARE') || text.includes('INFORMATICA')) return 'Tecnologia';
    if (text.includes('AGUA') || text.includes('ESGOTO') || text.includes('SEMAE') || text.includes('SANEAMENTO')) return 'Saneamento';

    return 'Geral';
}

async function updateCategories() {
    console.log('🔍 Buscando registros categorizados como "Geral"...');

    const { data: records, error: fetchError } = await supabase
        .from('expenses')
        .select('id, supplier_name, description')
        .eq('category', 'Geral');

    if (fetchError) {
        console.error('❌ Erro ao buscar registros:', fetchError.message);
        return;
    }

    if (!records || records.length === 0) {
        console.log('✅ Nenhum registro "Geral" encontrado.');
        return;
    }

    console.log(`📊 Encontrados ${records.length} registros. Iniciando re-categorização...`);

    let updatedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        const updates = batch.map(r => {
            // Note: we don't have 'orgao' in DB, so we use supplier and description
            const newCat = categorizeExpense('', r.supplier_name || '', r.description || '');
            if (newCat !== 'Geral') {
                return { id: r.id, category: newCat };
            }
            return null;
        }).filter(Boolean) as { id: string, category: string }[];

        if (updates.length > 0) {
            // Supabase upsert/update for multiple records with IDs
            const { error: updateError } = await supabase
                .from('expenses')
                .upsert(updates);

            if (updateError) {
                console.error(`❌ Erro no lote ${i}:`, updateError.message);
            } else {
                updatedCount += updates.length;
                process.stdout.write('.');
            }
        }
    }

    console.log(`\n\n🏁 Re-categorização Finalizada!`);
    console.log(`✨ Total processado: ${records.length}`);
    console.log(`✅ Total re-categorizado: ${updatedCount}`);
}

updateCategories();
