import React, { useState } from 'react';
import { Upload, Button, Form, Input, Card, Space, message, Tabs, Typography } from 'antd';
import { UploadOutlined, DownloadOutlined, FileTextOutlined, HomeOutlined, UserOutlined, ShoppingCartOutlined, PaperClipOutlined, CopyOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { XMLParser } from 'fast-xml-parser';

const { Text } = Typography;

function App() {
  const [form] = Form.useForm();
  const [invoiceRootKey, setInvoiceRootKey] = useState('Invoice');
  const [fullJson, setFullJson] = useState(null);
  const [rawXmlText, setRawXmlText] = useState('');
  const [invoiceLinesTotal, setInvoiceLinesTotal] = useState('0,00'); // Držimo ukupnu sumu za kontrolu

  const parserOption = {
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseTagValue: false,
    isArray: (tagName) => ["ext:UBLExtension", "cac:AdditionalDocumentReference", "cac:InvoiceLine"].includes(tagName)
  };

  const toDisplayFormat = (value) => {
    if (value === undefined || value === null || value === '') return '0,00';
    const rawStr = typeof value === 'object' ? value['#text'] : String(value);
    const num = Number(rawStr);
    if (isNaN(num)) return rawStr.replace('.', ',');
    return num.toFixed(2).replace('.', ',');
  };

  const toXmlFormat = (value) => {
    if (value === undefined || value === null || value === '') return '0.00';
    const cleanStr = String(value).replace(/\s/g, '').replace(',', '.');
    const num = Number(cleanStr);
    return isNaN(num) ? cleanStr : num.toFixed(2);
  };

  // Funkcija za računanje ukupne sume svih stavki na formi
  const calculateFormTotal = (lines = []) => {
    const totalSum = lines.reduce((acc, line) => {
      const lineTotal = Number(toXmlFormat(line?.['cbc:LineExtensionAmount'] || 0));
      return acc + (isNaN(lineTotal) ? 0 : lineTotal);
    }, 0);
    setInvoiceLinesTotal(totalSum.toFixed(2).replace('.', ','));
  };

  const handleBeforeUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlText = e.target.result;
        setRawXmlText(xmlText);
        const parser = new XMLParser(parserOption);
        const result = parser.parse(xmlText);
        const rootKey = Object.keys(result).find(key => key.includes('Invoice'));
        setInvoiceRootKey(rootKey);
        setFullJson(result);

        const invoiceData = result[rootKey];
        if (invoiceData['cac:InvoiceLine'] && Array.isArray(invoiceData['cac:InvoiceLine'])) {
          invoiceData['cac:InvoiceLine'] = invoiceData['cac:InvoiceLine'].map(line => ({
            ...line,
            'cbc:InvoicedQuantity': toDisplayFormat(line['cbc:InvoicedQuantity']),
            'cac:Price': {
              ...line['cac:Price'],
              'cbc:PriceAmount': toDisplayFormat(line['cac:Price']?.['cbc:PriceAmount'])
            },
            'cbc:LineExtensionAmount': toDisplayFormat(line['cbc:LineExtensionAmount'])
          }));
          calculateFormTotal(invoiceData['cac:InvoiceLine']);
        }

        form.setFieldsValue(invoiceData);
        message.success(`${file.name} učitan!`);
      } catch (error) {
        message.error('Greška pri parsiranju XML računa.');
      }
    };
    reader.readAsText(file);
    return false;
  };

  const handleValuesChange = (changedValues, allValues) => {
    if (changedValues['cac:InvoiceLine']) {
      const currentLines = allValues['cac:InvoiceLine'] || [];
      const changedIndex = changedValues['cac:InvoiceLine'].findIndex(line => line !== undefined);
      
      if (changedIndex !== -1) {
        const line = currentLines[changedIndex];
        const qty = Number(toXmlFormat(line?.['cbc:InvoicedQuantity']));
        const price = Number(toXmlFormat(line?.['cac:Price']?.['cbc:PriceAmount']));
        
        if (qty && price) {
          const total = qty * price;
          const linesCopy = [...form.getFieldValue('cac:InvoiceLine')];
          linesCopy[changedIndex]['cbc:LineExtensionAmount'] = total.toFixed(2).replace('.', ',');
          form.setFieldsValue({ 'cac:InvoiceLine': linesCopy });
          
          // Ažuriramo kontrolnu sumu odmah nakon promjene na nekoj stavci
          calculateFormTotal(linesCopy);
          return;
        }
      }
      calculateFormTotal(currentLines);
    }
  };

  const tabItems = fullJson ? [
    {
      key: '1',
      label: <span><FileTextOutlined />Opći podaci</span>,
      children: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item name="cbc:ID" label="ID računa"><Input /></Form.Item>
          {/* NOVO POLJE: Vrijeme izdavanja u formatu 16:17:00 */}
          <Form.Item name="cbc:IssueTime" label="Vrijeme izdavanja (format 0-24)"><Input placeholder="npr. 16:17:00" /></Form.Item>
          <Form.Item name="cbc:IssueDate" label="Datum izdavanja"><Input type="date" /></Form.Item>
          <Form.Item name="cbc:DueDate" label="Datum dospijeća"><Input type="date" /></Form.Item>
          <Form.Item name="cbc:DocumentCurrencyCode" label="Valuta (EUR)"><Input /></Form.Item>
        </div>
      ),
    },
    {
      key: '2',
      label: <span><HomeOutlined />Dobavljač</span>,
      children: (
        <>
          <Form.Item name={['cac:AccountingSupplierParty', 'cac:Party', 'cac:PartyLegalEntity', 'cbc:RegistrationName']} label="Naziv tvrtke dobavljača"><Input /></Form.Item>
          <Form.Item name={['cac:AccountingSupplierParty', 'cac:Party', 'cac:PartyTaxScheme', 'cbc:CompanyID']} label="OIB Dobavljača"><Input /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
            <Form.Item name={['cac:AccountingSupplierParty', 'cac:Party', 'cac:PostalAddress', 'cbc:StreetName']} label="Ulica"><Input /></Form.Item>
            <Form.Item name={['cac:AccountingSupplierParty', 'cac:Party', 'cac:PostalAddress', 'cbc:CityName']} label="Grad"><Input /></Form.Item>
            <Form.Item name={['cac:AccountingSupplierParty', 'cac:Party', 'cac:PostalAddress', 'cbc:PostalZone']} label="Poštanski broj"><Input /></Form.Item>
          </div>
          <Form.Item name={['cac:AccountingSupplierParty', 'cac:Party', 'cac:Contact', 'cbc:Telephone']} label="Telefon dobavljača"><Input /></Form.Item>
        </>
      ),
    },
    {
      key: '3',
      label: <span><UserOutlined />Kupac</span>,
      children: (
        <>
          <Form.Item name={['cac:AccountingCustomerParty', 'cac:Party', 'cac:PartyLegalEntity', 'cbc:RegistrationName']} label="Naziv tvrtke kupca"><Input /></Form.Item>
          <Form.Item name={['cac:AccountingCustomerParty', 'cac:Party', 'cac:PartyTaxScheme', 'cbc:CompanyID']} label="OIB Kupca"><Input /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
            <Form.Item name={['cac:AccountingCustomerParty', 'cac:Party', 'cac:PostalAddress', 'cbc:StreetName']} label="Ulica"><Input /></Form.Item>
            <Form.Item name={['cac:AccountingCustomerParty', 'cac:Party', 'cac:PostalAddress', 'cbc:CityName']} label="Grad"><Input /></Form.Item>
            <Form.Item name={['cac:AccountingCustomerParty', 'cac:Party', 'cac:PostalAddress', 'cbc:PostalZone']} label="Poštanski broj"><Input /></Form.Item>
          </div>
        </>
      ),
    },
    {
      key: '4',
      label: <span><ShoppingCartOutlined />Stavke</span>,
      children: (
        <Form.List name="cac:InvoiceLine">
          {(fields, { add, remove }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {fields.map(({ key, name, ...restField }, index) => {
                const currentLine = form.getFieldValue(['cac:InvoiceLine', name]);
                const isCodeObj = typeof currentLine?.['cac:Item']?.['cac:CommodityClassification']?.['cbc:ItemClassificationCode'] === 'object';

                return (
                  <Card key={key} size="small" title={`Stavka ${index + 1}`} extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => { remove(name); const updated = form.getFieldValue('cac:InvoiceLine') || []; calculateFormTotal(updated); }} />}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <Form.Item {...restField} name={[name, 'cbc:ID']} label="Br."><Input /></Form.Item>
                      <Form.Item {...restField} name={[name, 'cac:Item', 'cbc:Name']} label="Naziv" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
                      <Form.Item {...restField} name={[name, 'cac:Item', 'cac:CommodityClassification', 'cbc:ItemClassificationCode', isCodeObj ? '#text' : undefined]} label="Klasifikacija"><Input /></Form.Item>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <Form.Item {...restField} name={[name, 'cbc:InvoicedQuantity']} label="Količina" rules={[{ required: true }]}><Input /></Form.Item>
                      <Form.Item {...restField} name={[name, 'cac:Price', 'cbc:PriceAmount']} label="Cijena" rules={[{ required: true }]}><Input /></Form.Item>
                      <Form.Item {...restField} name={[name, 'cbc:LineExtensionAmount']} label="Ukupno" rules={[{ required: true }]}><Input /></Form.Item>
                    </div>
                  </Card>
                );
              })}
              
              {/* KONTROLNA SUMA: Prikazuje zbroj svih polja 'Ukupno' na ekranu u formatu sa zarezom */}
              <Card size="small" style={{ background: '#fafafa', border: '1px solid #d9d9d9', textAlign: 'right' }}>
                <Text strong style={{ fontSize: '16px' }}>
                  Kontrolna suma svih stavki: <span style={{ color: '#1890ff' }}>{invoiceLinesTotal} €</span>
                </Text>
              </Card>

              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Button 
                  type="primary" 
                  icon={<CopyOutlined />} 
                  onClick={() => {
                    const currentFormLines = form.getFieldValue('cac:InvoiceLine') || [];
                    const regex = /<cac:InvoiceLine>[\s\S]*?<\/cac:InvoiceLine>/g;
                    const matches = rawXmlText.match(regex);
                    
                    if (matches && matches.length > 0) {
                      let lastXmlLineText = matches[matches.length - 1];
                      const nextId = String(currentFormLines.length + 1);
                      const lastFormValues = currentFormLines[currentFormLines.length - 1];
                      
                      if (lastFormValues) {
                        const cleanQty = toXmlFormat(lastFormValues['cbc:InvoicedQuantity']);
                        const cleanPrice = toXmlFormat(lastFormValues['cac:Price']?.['cbc:PriceAmount']);
                        const cleanTotal = toXmlFormat(lastFormValues['cbc:LineExtensionAmount']);
                        const cleanName = String(lastFormValues['cac:Item']?.['cbc:Name'] || '');

                        lastXmlLineText = lastXmlLineText.replace(/(<cbc:ID>)(.*?)(<\/cbc:ID>)/, `$1${nextId}$3`);
                        lastXmlLineText = lastXmlLineText.replace(/(<cbc:InvoicedQuantity.*?>)(.*?)(<\/cbc:InvoicedQuantity>)/, `$1${cleanQty}$3`);
                        lastXmlLineText = lastXmlLineText.replace(/(<cbc:PriceAmount.*?>)(.*?)(<\/cbc:PriceAmount>)/, `$1${cleanPrice}$3`);
                        lastXmlLineText = lastXmlLineText.replace(/(<cbc:LineExtensionAmount.*?>)(.*?)(<\/cbc:LineExtensionAmount>)/, `$1${cleanTotal}$3`);
                        lastXmlLineText = lastXmlLineText.replace(/(<cbc:Name>)([\s\S]*?)(<\/cbc:Name>)/, `$1${cleanName}$3`);
                        
                        if (lastFormValues['cac:Item']?.['cac:CommodityClassification']?.['cbc:ItemClassificationCode']) {
                          const cleanCode = String(lastFormValues['cac:Item']?.['cac:CommodityClassification']?.['cbc:ItemClassificationCode']);
                          lastXmlLineText = lastXmlLineText.replace(/(<cbc:ItemClassificationCode.*?>)(.*?)(<\/cbc:ItemClassificationCode>)/, `$1${cleanCode}$3`);
                        }
                      }

                      const targetTag = "</Invoice>";
                      const lastInvoiceIndex = rawXmlText.lastIndexOf(targetTag);

                      if (lastInvoiceIndex !== -1) {
                        const newXmlString = 
                          rawXmlText.substring(0, lastInvoiceIndex) + 
                          lastXmlLineText + "\n" +
                          rawXmlText.substring(lastInvoiceIndex);
                        
                        setRawXmlText(newXmlString);

                        const clonedItem = {
                          ...lastFormValues,
                          'cbc:ID': nextId,
                          'cbc:InvoicedQuantity': toDisplayFormat(toXmlFormat(lastFormValues['cbc:InvoicedQuantity'])),
                          'cac:Price': {
                            ...lastFormValues['cac:Price'],
                            'cbc:PriceAmount': toDisplayFormat(toXmlFormat(lastFormValues['cac:Price']?.['cbc:PriceAmount']))
                          },
                          'cbc:LineExtensionAmount': toDisplayFormat(toXmlFormat(lastFormValues['cbc:LineExtensionAmount']))
                        };

                        const updatedLines = [...currentFormLines, clonedItem];
                        add(clonedItem);
                        calculateFormTotal(updatedLines);
                        message.success(`Stavka br. ${nextId} klonirana u XML!`);
                      }
                    } else {
                      message.error('Nije pronađena stavka u XML-u za kloniranje.');
                    }
                  }}
                >
                  Kloniraj zadnju stavku
                </Button>
              </div>
            </div>
          )}
        </Form.List>
      ),
    },
    {
      key: '5',
      label: <span><PaperClipOutlined />Privitci</span>,
      children: (
        <Form.List name="cac:AdditionalDocumentReference">
          {(fields, { add, remove }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} align="baseline">
                  <Form.Item {...restField} name={[name, 'cbc:ID']} label="ID"><Input style={{ width: '80px' }} /></Form.Item>
                  <Form.Item {...restField} name={[name, 'cbc:DocumentDescription']} label="Opis"><Input style={{ width: '300px' }} /></Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                </Space>
              ))}
              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Dodaj privitak</Button>
            </div>
          )}
        </Form.List>
      ),
    }
  ] : [];

  // IZVOZ: Ažurira vrijeme izdavanja (IssueTime) u XML stringu prije preuzimanja
  const handleExport = (formValues) => {
    let finalXml = rawXmlText;
    
    // Ako je korisnik unio ili izmijenio IssueTime na formi, upisujemo ga u XML tekst pomoću Regex-a
    if (formValues['cbc:IssueTime']) {
      const cleanTime = String(formValues['cbc:IssueTime']).trim();
      finalXml = finalXml.replace(/(<cbc:IssueTime>)(.*?)(<\/cbc:IssueTime>)/, `$1${cleanTime}$3`);
    }

    const blob = new Blob([finalXml], { type: 'text/xml;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `izmijenjeni_eracun.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    message.success('XML uspješno preuzet!');
  };

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh', padding: '40px 20px' }}>
      <Card style={{ maxWidth: 800, margin: '0 auto' }} title="UBL e-Račun Editor">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', padding: '20px', border: '1px dashed #e8e8e8' }}>
            <Upload beforeUpload={handleBeforeUpload} maxCount={1} showUploadList={false} accept=".xml">
              <Button type="primary" icon={<UploadOutlined />}>Učitaj e-Račun</Button>
            </Upload>
          </div>
          {fullJson && (
            <Form form={form} layout="vertical" onValuesChange={handleValuesChange} onFinish={handleExport}>
              <Tabs defaultActiveKey="1" items={tabItems} style={{ marginBottom: '24px' }} />
              <Button type="primary" block size="large" icon={<DownloadOutlined />} htmlType="submit">Izvezi XML</Button>
            </Form>
          )}
        </Space>
      </Card>
    </div>
  );
}

export default App;
