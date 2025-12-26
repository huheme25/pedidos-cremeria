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

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const products = [];

    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
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

      if (values.length >= headers.length) {
        const product = {};
        headers.forEach((header, idx) => {
          product[header] = values[idx];
        });
        products.push(product);
      }
    }

    return products;
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecciona un archivo');
      return;
    }

    setUploading(true);
    try {
      // Read CSV file directly
      const text = await file.text();
      const products = parseCSV(text);

      if (products.length === 0) {
        toast.error('No se encontraron productos en el archivo');
        setUploading(false);
        return;
      }

      console.log(`Parsed ${products.length} products from CSV`);

      // Validate categories and units
      const validCategories = ['quesos', 'cremas', 'mantequillas', 'yogures', 'leches', 'otros'];
      const validUnits = ['caja', 'pieza', 'paquete', 'kg', 'litro'];
      const validWarehouseTypes = ['secos', 'refrigerados', 'barra', 'mixto'];

      const normalizedProducts = products.map(p => {
        const normalized = {
          sku: p.sku?.toUpperCase() || '',
          name: p.name || '',
          category: validCategories.includes(p.category?.toLowerCase()) 
            ? p.category.toLowerCase() 
            : 'otros',
          unit: validUnits.includes(p.unit?.toLowerCase()) 
            ? p.unit.toLowerCase() 
            : 'pieza',
          wholesale_price: parseFloat(p.wholesale_price) || 0,
          warehouse_type: validWarehouseTypes.includes(p.warehouse_type?.toLowerCase())
            ? p.warehouse_type.toLowerCase()
            : 'refrigerados',
          is_active: p.is_active?.toLowerCase() !== 'false'
        };

        // Add optional price lists
        if (p.price_list_1) normalized.price_list_1 = parseFloat(p.price_list_1);
        if (p.price_list_2) normalized.price_list_2 = parseFloat(p.price_list_2);
        if (p.price_list_3) normalized.price_list_3 = parseFloat(p.price_list_3);
        if (p.price_list_4) normalized.price_list_4 = parseFloat(p.price_list_4);
        if (p.price_list_5) normalized.price_list_5 = parseFloat(p.price_list_5);

        // Handle final measurement
        if (p.has_final_measurement?.toLowerCase() === 'true') {
          normalized.has_final_measurement = true;
          if (p.final_measurement_unit) {
            normalized.final_measurement_unit = p.final_measurement_unit;
          }
        }

        // Handle variants
        if (p.is_master_product?.toLowerCase() === 'true') {
          normalized.is_master_product = true;
        }
        if (p.master_product_id) {
          normalized.master_product_id = p.master_product_id;
        }
        if (p.variant_name) {
          normalized.variant_name = p.variant_name;
        }
        if (p.variant_order) {
          normalized.variant_order = parseInt(p.variant_order) || 0;
        }

        return normalized;
      }).filter(p => p.sku && p.name);

      console.log(`Normalized ${normalizedProducts.length} valid products`);

      // Import products in batches
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < normalizedProducts.length; i += batchSize) {
        batches.push(normalizedProducts.slice(i, i + batchSize));
      }

      let totalCreated = 0;
      let errors = 0;

      for (let i = 0; i < batches.length; i++) {
        try {
          const created = await base44.entities.Product.bulkCreate(batches[i]);
          totalCreated += created.length;
          console.log(`Imported batch ${i + 1}/${batches.length}: ${created.length} products`);
        } catch (batchError) {
          console.error(`Error in batch ${i + 1}:`, batchError);
          errors++;
        }
      }

      setResults({
        success: true,
        total: normalizedProducts.length,
        created: totalCreated,
        errors: errors
      });

      if (errors > 0) {
        toast.success(`${totalCreated} productos importados (${errors} lotes con errores)`);
      } else {
        toast.success(`${totalCreated} productos importados exitosamente`);
      }
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
    const template = `sku,name,category,unit,wholesale_price,price_list_1,price_list_2,price_list_3,price_list_4,price_list_5,warehouse_type,has_final_measurement,final_measurement_unit,is_master_product,master_product_id,variant_name,variant_order,is_active
QSO001M,Queso Oaxaca,quesos,kg,0,0,0,0,0,0,refrigerados,false,,true,,,0,true
QSO001-1,Queso Oaxaca 1kg,quesos,kg,145.00,150.00,155.00,160.00,165.00,170.00,refrigerados,false,,false,QSO001M,1kg,1,true
QSO001-2,Queso Oaxaca 500g,quesos,kg,75.00,78.00,80.00,82.00,84.00,86.00,refrigerados,false,,false,QSO001M,500g,2,true
CRM001,Crema Ácida 1L,cremas,litro,52.00,55.00,58.00,60.00,62.00,65.00,refrigerados,false,,false,,,0,true
MNT001,Mantequilla Sin Sal 250g,mantequillas,pieza,45.00,48.00,50.00,52.00,54.00,56.00,refrigerados,false,,false,,,0,true
QSO002,Queso Crema Media Pieza,quesos,pieza,75.00,78.00,80.00,82.00,84.00,86.00,barra,true,kg,false,,,0,true`;
    
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
              <li><strong>sku:</strong> Clave del producto (requerido)</li>
              <li><strong>name:</strong> Nombre del producto (requerido)</li>
              <li><strong>category:</strong> quesos, cremas, mantequillas, yogures, leches, otros (requerido)</li>
              <li><strong>unit:</strong> caja, pieza, paquete, kg, litro (requerido)</li>
              <li><strong>wholesale_price:</strong> Precio mayorista (requerido)</li>
              <li><strong>price_list_1 a 5:</strong> Listas de precios (opcional)</li>
              <li><strong>warehouse_type:</strong> secos, refrigerados, barra, mixto (opcional)</li>
              <li><strong>has_final_measurement:</strong> true o false (opcional)</li>
              <li><strong>final_measurement_unit:</strong> kg, litros, etc. (si has_final_measurement es true)</li>
              <li><strong>is_master_product:</strong> true o false (para productos con variantes)</li>
              <li><strong>master_product_id:</strong> SKU del producto maestro (si es variante)</li>
              <li><strong>variant_name:</strong> nombre de la variante (ej: 1kg, 500g)</li>
              <li><strong>variant_order:</strong> orden de aparición (1, 2, 3...)</li>
              <li><strong>is_active:</strong> true o false (opcional, default: true)</li>
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
                      {results.errors > 0 && ` (${results.errors} lotes con errores)`}
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