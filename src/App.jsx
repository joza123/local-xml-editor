import React, { useState } from 'react';
import { Upload, Button, Form, Input, Card, Space, message, Tabs, InputNumber } from 'antd';
import { UploadOutlined, DownloadOutlined, FileTextOutlined, HomeOutlined, UserOutlined, ShoppingCartOutlined, PaperClipOutlined, PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

function App() {
  const [form] = Form.useForm();
  const [invoiceRootKey, setInvoiceRootKey] = useState('Invoice');
  const [fullJson, setFullJson] = useState(null);

  const parserOption = {
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    isArray: (tagName) => ["ext:UBLExtension", "cac:AdditionalDocumentReference", "cac:InvoiceLine"].includes(tagName)
  };

  const normalizeJson = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') {
      return { '#text': obj };
    }
    if (Array.isArray(obj)) {
      return obj.map(item => normalizeJson(item));
    }
    const normalized = {};
    for (const key in obj) {
      if (key === '#text' || key.startsWith('@_')) {
        normalized[key] = obj[key];
      } else {
        normalized[key] = normalizeJson(obj[key]);
      }
    }
    return normalized;
  };

  const handleBeforeUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parser = new XMLParser(parserOption);
        const result = parser.parse(e.target.result);
        const rootKey = Object.keys(result).find(key => key.includes('Invoice'));
        setInvoiceRootKey(rootKey);
        
        const normalizedInvoice = normalizeJson(result[rootKey]);
        setFullJson({ [rootKey]: normalizedInvoice });
        form.setFieldsValue(normalizedInvoice);
        
        message.success(`${file.name} učitan!`);
      } catch (error) {
        message.error('Greška pri parsiranju.');
      }
    };
    reader.readAsText(file);
    return false;
  };

  const handleExport = (formValues) => {
    const updatedInvoice = { ...fullJson[invoiceRootKey], ...formValues };
    const finalJson = { [invoiceRootKey]: updatedInvoice };
    const builder = new XMLBuilder({ format: true, ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });
    let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(finalJson);
    const blob = new Blob([xmlString], { type: 'text/xml;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `izmijenjeni_eracun.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    message.success('XML izvezen!');
  };

  const handleValuesChange = (changedValues, allValues) => {
    if (changedValues['cac:InvoiceLine']) {
      const currentLines = allValues['cac:InvoiceLine'] || [];
      const changedIndex = changedValues['cac:InvoiceLine'].findIndex(line => line !== undefined);
      if (changedIndex !== -1) {
        const line = currentLines[changedIndex];
        const qty = Number(line?.['cbc:InvoicedQuantity']?.['#text'] || 0);
        const price = Number(line?.['cac:Price']?.['cbc:PriceAmount']?.['#text'] || 0);
        if (qty && price) {
          const total = qty * price;
          const linesCopy = [...form.getFieldValue('cac:InvoiceLine')];
          if (!linesCopy[changedIndex]['cbc:LineExtensionAmount']) linesCopy[changedIndex]['cbc:LineExtensionAmount'] = {};
          linesCopy[changedIndex]['cbc:LineExtensionAmount']['#text'] = Number(total.toFixed(2));
          form.setFieldsValue({ 'cac:InvoiceLine': linesCopy });
        }
      }
    }
  };

  const tabItems = fullJson ? [
    {
      key: '1',
      label: <span><FileTextOutlined />Opći podaci</span>,
      children: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item name={['cbc:ID', '#text']} label="ID"><Input /></Form.Item>
          <Form.Item name={['cbc:InvoiceTypeCode', '#text']} label="Tip"><Input /></Form.Item>
          <Form.Item name={['cbc:IssueDate', '#text']} label="Datum izdavanja"><Input type="date" /></Form.Item>
          <Form.Item name={['cbc:DueDate', '#text']} label="Datum dospijeća"><Input type="date" /></Form.Item>
          <Form.Item name={['cbc:DocumentCurrencyCode', '#text']} label="Valuta"><Input /></Form.Item>
        </div>
      ),
    },
     {
      key: '2',
      label: <span><HomeOutlined />Dobavljač</span>,
      children: (
        <>
          <Form.Item name={['cac:AccountingSupplierParty', 'cac:Party', 'cac:PartyLegalEntity', 'cbc:RegistrationName', '#text']} label="Naziv dobavljača"><Input /></Form.Item>
          <Form.Item name={['cac:AccountingSupplierParty', 'cac:Party', 'cac:PartyTaxScheme', 'cbc:CompanyID', '#text']} label="OIB dobavljača"><Input /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
            <Form.Item name={['cac:AccountingSupplierParty', 'cac:Party', 'cac:PostalAddress', 'cbc:StreetName', '#text']} label="Ulica"><Input /></Form.Item>
            <Form.Item name={['cac:AccountingSupplierParty', 'cac:Party', 'cac:PostalAddress', 'cbc:CityName', '#text']} label="Grad"><Input /></Form.Item>
            <Form.Item name={['cac:AccountingSupplierParty', 'cac:Party', 'cac:PostalAddress', 'cbc:PostalZone', '#text']} label="Pbr"><Input /></Form.Item>
          </div>
        </>
      ),
    },
    {
      key: '3',
      label: <span><UserOutlined />Kupac</span>,
      children: (
        <>
          <Form.Item name={['cac:AccountingCustomerParty', 'cac:Party', 'cac:PartyLegalEntity', 'cbc:RegistrationName', '#text']} label="Naziv kupca"><Input /></Form.Item>
          <Form.Item name={['cac:AccountingCustomerParty', 'cac:Party', 'cac:PartyTaxScheme', 'cbc:CompanyID', '#text']} label="OIB kupca"><Input /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
            <Form.Item name={['cac:AccountingCustomerParty', 'cac:Party', 'cac:PostalAddress', 'cbc:StreetName', '#text']} label="Ulica"><Input /></Form.Item>
            <Form.Item name={['cac:AccountingCustomerParty', 'cac:Party', 'cac:PostalAddress', 'cbc:CityName', '#text']} label="Grad"><Input /></Form.Item>
            <Form.Item name={['cac:AccountingCustomerParty', 'cac:Party', 'cac:PostalAddress', 'cbc:PostalZone', '#text']} label="Pbr"><Input /></Form.Item>
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
              {fields.map(({ key, name, ...restField }, index) => (
                <Card key={key} size="small" title={`Stavka ${index + 1}`} extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <Form.Item {...restField} name={[name, 'cbc:ID', '#text']} label="Br."><Input /></Form.Item>
                    <Form.Item {...restField} name={[name, 'cac:Item', 'cbc:Name', '#text']} label="Naziv" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item {...restField} name={[name, 'cac:Item', 'cac:CommodityClassification', 'cbc:ItemClassificationCode', '#text']} label="Klasifikacija"><Input /></Form.Item>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <Form.Item {...restField} name={[name, 'cbc:InvoicedQuantity', '#text']} label="Količina" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
                    <Form.Item {...restField} name={[name, 'cac:Price', 'cbc:PriceAmount', '#text']} label="Cijena" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
                    <Form.Item {...restField} name={[name, 'cbc:LineExtensionAmount', '#text']} label="Ukupno" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
                  </div>
                </Card>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Button type="dashed" onClick={() => add({ 'cbc:ID': { '#text': String(fields.length + 1) } })} icon={<PlusOutlined />}>Prazna stavka</Button>
                <Button type="dashed" icon={<CopyOutlined />} onClick={() => {
                  const currentFormLines = form.getFieldValue('cac:InvoiceLine') || [];
                  const xmlLines = fullJson?.[invoiceRootKey]?.['cac:InvoiceLine'] || [];
                  if (xmlLines.length > 0) {
                    const cloned = JSON.parse(JSON.stringify(xmlLines[xmlLines.length - 1]));
                    if (!cloned['cbc:ID']) cloned['cbc:ID'] = {};
                    cloned['cbc:ID']['#text'] = String(currentFormLines.length + 1);
                    const lastForm = currentFormLines[currentFormLines.length - 1];
                    if (lastForm) {
                      if (!cloned['cac:Item']) cloned['cac:Item'] = {};
                      if (!cloned['cac:Item']['cbc:Name']) cloned['cac:Item']['cbc:Name'] = {};
                      cloned['cac:Item']['cbc:Name']['#text'] = lastForm['cac:Item']?.['cbc:Name']?.['#text'];
                      
                      if (!cloned['cac:Item']['cac:CommodityClassification']) cloned['cac:Item']['cac:CommodityClassification'] = {};
                      if (!cloned['cac:Item']['cac:CommodityClassification']['cbc:ItemClassificationCode']) cloned['cac:Item']['cac:CommodityClassification']['cbc:ItemClassificationCode'] = {};
                      cloned['cac:Item']['cac:CommodityClassification']['cbc:ItemClassificationCode']['#text'] = lastForm['cac:Item']?.['cac:CommodityClassification']?.['cbc:ItemClassificationCode']?.['#text'];
                      
                      if (!cloned['cbc:InvoicedQuantity']) cloned['cbc:InvoicedQuantity'] = {};
                      cloned['cbc:InvoicedQuantity']['#text'] = lastForm['cbc:InvoicedQuantity']?.['#text'];
                      
                      if (!cloned['cac:Price']) cloned['cac:Price'] = {};
                      if (!cloned['cac:Price']['cbc:PriceAmount']) cloned['cac:Price']['cbc:PriceAmount'] = {};
                      cloned['cac:Price']['cbc:PriceAmount']['#text'] = lastForm['cac:Price']?.['cac:PriceAmount']?.['#text'];
                      
                      if (!cloned['cbc:LineExtensionAmount']) cloned['cbc:LineExtensionAmount'] = {};
                      cloned['cbc:LineExtensionAmount']['#text'] = lastForm['cbc:LineExtensionAmount']?.['#text'];
                    }
                    add(cloned);
                    message.success('Klonirano iz XML-a!');
                  } else {
                    add({ 'cbc:ID': { '#text': '1' } });
                  }
                }}>Kloniraj stavku</Button>
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
                  <Form.Item {...restField} name={[name, 'cbc:ID', '#text']} label="ID"><Input style={{ width: '80px' }} /></Form.Item>
                  <Form.Item {...restField} name={[name, 'cbc:DocumentDescription', '#text']} label="Opis"><Input style={{ width: '300px' }} /></Form.Item>
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
