import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  ArrowLeft, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle,
  XCircle,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminProductsImport() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Por favor selecciona un archivo CSV');
        return;
      }
      setFile(selectedFile);
      readFilePreview(selectedFile);
    }
  };

  const readFilePreview = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        toast.error('El archivo está vacío');
        return;
      }

      // Parse CSV
      const rows = lines.map(line => {
        // Simple CSV parser (handles basic cases)
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        return values;
      });

      setPreview(rows.slice(0, 6)); // Show first 5 rows + header
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecciona un archivo');
      return;
    }

    setUploading(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Define expected schema
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            sku: { type: "string" },
            name: { type: "string" },
            category: { type: "string" },
            unit: { type: "string" },
            wholesale_price: { type: "number" },
            is_active: { type: "boolean" }
          },
          required: ["sku", "name", "category", "unit", "wholesale_price"]
        }
      };

      // Extract data using LLM
      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: schema
      });

      if (extraction.status === 'error') {
        toast.error(extraction.details || 'Error al procesar el archivo');
        console.error('Extraction error:', extraction);
        setUploading(false);
        return;
      }

      const products = extraction.output || [];

      if (products.length === 0) {
        toast.error('No se encontraron productos en el archivo');
        console.log('Extraction result:', extraction);
        setUploading(false);
        return;
      }

      console.log(`Extracted ${products.length} products from file`);

      // Validate categories and units
      const validCategories = ['quesos', 'cremas', 'mantequillas', 'yogures', 'leches', 'otros'];
      const validUnits = ['caja', 'pieza', 'paquete', 'kg', 'litro'];

      const normalizedProducts = products.map(p => ({
        sku: p.sku?.toUpperCase() || '',
        name: p.name || '',
        category: validCategories.includes(p.category?.toLowerCase()) 
          ? p.category.toLowerCase() 
          : 'otros',
        unit: validUnits.includes(p.unit?.toLowerCase()) 
          ? p.unit.toLowerCase() 
          : 'pieza',
        wholesale_price: parseFloat(p.wholesale_price) || 0,
        is_active: p.is_active !== false
      }));

      // Import products in batches if many
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < normalizedProducts.length; i += batchSize) {
        batches.push(normalizedProducts.slice(i, i + batchSize));
      }

      let totalCreated = 0;
      for (let i = 0; i < batches.length; i++) {
        try {
          const created = await base44.entities.Product.bulkCreate(batches[i]);
          totalCreated += created.length;
          console.log(`Imported batch ${i + 1}/${batches.length}: ${created.length} products`);
        } catch (batchError) {
          console.error(`Error in batch ${i + 1}:`, batchError);
        }
      }

      setResults({
        success: true,
        total: normalizedProducts.length,
        created: totalCreated
      });

      toast.success(`${totalCreated} productos importados exitosamente`);
    } catch (error) {
      console.error(error);
      toast.error('Error al importar productos');
      setResults({
        success: false,
        error: error.message
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `sku,name,category,unit,wholesale_price,is_active
QSO001,Queso Oaxaca 1kg,quesos,kg,145.00,true
CRM001,Crema Ácida 1L,cremas,litro,52.00,true
MNT001,Mantequilla Sin Sal 250g,mantequillas,pieza,45.00,true`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_productos.csv';
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(createPageUrl('AdminProducts'))}
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Importar Productos</h1>
          <p className="text-slate-500 text-sm">Sube un archivo CSV con tus productos</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Formato del Archivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              El archivo CSV debe contener las siguientes columnas:
            </p>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li><strong>sku:</strong> Clave del producto</li>
              <li><strong>name:</strong> Nombre del producto</li>
              <li><strong>category:</strong> quesos, cremas, mantequillas, yogures, leches, otros</li>
              <li><strong>unit:</strong> caja, pieza, paquete, kg, litro</li>
              <li><strong>wholesale_price:</strong> Precio mayorista</li>
              <li><strong>is_active:</strong> true o false (opcional)</li>
            </ul>
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="w-full"
            >
              <Download size={16} className="mr-2" />
              Descargar Plantilla
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Subir Archivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-amber-400 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700 mb-1">
                  {file ? file.name : 'Selecciona un archivo CSV'}
                </p>
                <p className="text-xs text-slate-500">
                  Haz clic para seleccionar
                </p>
              </label>
            </div>

            <Button 
              onClick={handleImport}
              disabled={!file || uploading}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload size={18} className="mr-2" />
                  Importar Productos
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {preview.length > 0 && (
        <Card className="border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Vista Previa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview[0]?.map((header, idx) => (
                      <TableHead key={idx}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(1).map((row, idx) => (
                    <TableRow key={idx}>
                      {row.map((cell, cellIdx) => (
                        <TableCell key={cellIdx} className="text-sm">
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {preview.length > 6 && (
              <p className="text-xs text-slate-500 mt-2">
                Mostrando las primeras 5 filas de {preview.length - 1} productos
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {results && (
        <Card className={`border-2 ${results.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              {results.success ? (
                <>
                  <CheckCircle className="text-green-600" size={32} />
                  <div>
                    <p className="font-semibold text-green-800">
                      ¡Importación Exitosa!
                    </p>
                    <p className="text-sm text-green-700">
                      Se importaron {results.created} de {results.total} productos
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="text-red-600" size={32} />
                  <div>
                    <p className="font-semibold text-red-800">Error en la Importación</p>
                    <p className="text-sm text-red-700">{results.error}</p>
                  </div>
                </>
              )}
            </div>
            {results.success && (
              <Button 
                onClick={() => navigate(createPageUrl('AdminProducts'))}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white"
              >
                Ver Productos
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-amber-200 bg-amber-50 mt-6">
        <CardContent className="p-4">
          <p className="text-sm text-amber-800">
            <strong>Nota:</strong> La importación usa IA para extraer y validar los datos. 
            Si tu archivo tiene un formato diferente, el sistema intentará interpretarlo automáticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}