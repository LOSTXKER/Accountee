// src/app/api/test-wht/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
    try {
        console.log('Testing WHT certificate generation...');
        
        // Test 1: Check if PDF template exists
        const templatePath = path.join(process.cwd(), 'public', 'approve_wh3_081156.pdf');
        console.log('Template path:', templatePath);
        
        try {
            const stats = await fs.stat(templatePath);
            console.log('Template file exists, size:', stats.size);
        } catch (error) {
            console.error('Template file not found:', error);
            return NextResponse.json({ error: 'Template file not found', path: templatePath }, { status: 500 });
        }
        
        // Test 2: Try to load PDF
        try {
            const pdfBytes = await fs.readFile(templatePath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            console.log('PDF loaded successfully');
            
            const form = pdfDoc.getForm();
            const fields = form.getFields();
            console.log('PDF has', fields.length, 'form fields');
            
            // List first 5 field names for debugging
            fields.slice(0, 5).forEach((field, index) => {
                console.log(`Field ${index}:`, field.getName(), field.constructor.name);
            });
        } catch (error) {
            console.error('Error loading PDF:', error);
            return NextResponse.json({ error: 'Error loading PDF', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
        }
        
        // Test 3: Check if font exists
        const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Sarabun-Regular.ttf');
        console.log('Font path:', fontPath);
        
        try {
            const fontStats = await fs.stat(fontPath);
            console.log('Font file exists, size:', fontStats.size);
        } catch (error) {
            console.error('Font file not found:', error);
            return NextResponse.json({ error: 'Font file not found', path: fontPath }, { status: 500 });
        }
        
        // Test 4: Try to embed font
        try {
            const pdfBytes = await fs.readFile(templatePath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            
            // Register fontkit
            const fontkit = require('fontkit');
            pdfDoc.registerFontkit(fontkit);
            
            const fontBytes = await fs.readFile(fontPath);
            const sarabunFont = await pdfDoc.embedFont(fontBytes);
            console.log('Font embedded successfully');
        } catch (error) {
            console.error('Error embedding font:', error);
            return NextResponse.json({ error: 'Error embedding font', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
        }
        
        return NextResponse.json({ 
            success: true, 
            message: 'All tests passed',
            templatePath,
            fontPath
        });
        
    } catch (error) {
        console.error('Test failed:', error);
        return NextResponse.json({ 
            error: 'Test failed', 
            details: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}
