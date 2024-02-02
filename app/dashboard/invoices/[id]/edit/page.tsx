/*
Next.js allows you to create Dynamic Route Segments when you don't know the exact segment name 
and want to create routes based on data. This could be blog post titles, product pages, etc. 
You can create dynamic route segments by wrapping a folder's name in square brackets. 
For example, [id], [post] or [slug].
*/
import Form from "@/app/ui/invoices/edit-form";
import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
import { fetchInvoiceById, fetchCustomers } from "@/app/lib/data";

export default async function Page( { params }:{ params: { id: string }} ) {
  const id = params.id;
  const [invoice, customers] = await Promise.all([
    fetchInvoiceById(id),
    fetchCustomers(),
  ]);
  
  return(
    <main>
      <Breadcrumbs 
        breadcrumbs={[
          {label: 'Invoices', href: '/dashboard/invoices'},
          {label: 'Edit Invoice',
            href: `/dashboard/invoices/${id}/edit`,
            active: true,
          },
        ]}
      />
      <Form invoice={invoice} customers={customers} />
    </main>
  );
}