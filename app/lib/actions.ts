'use server'; //mark all the exported functions within the file as server functions
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import credentials from 'next-auth/providers/credentials';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
      invalid_type_error: 'Please select a customer.'
  }),
  amount: z.coerce //coerce=change and validate
  .number()
  .gt( 0, { message: 'Please enter an amount greater than $0.' }), 
  status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice status.'
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string|null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  const validateFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if(!validateFields.success) {
    return {
      errors: validateFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to create invoice.',
    };
  };

  //console.log(validateFields);

  const { customerId, amount, status } = validateFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];
  const date_formatted = new Date().toISOString().replace(/T.*/,'').split('-').reverse().join('.');
  //dd.mm.yyyy format: https://gist.github.com/khalid32/845ace7b1b4654c77bb9075959fe1054

  try {
  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices')
}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
  const validateFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if(!validateFields.success) {
    return {
      errors: validateFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  };

  const { customerId, amount, status } = validateFields.data;
  const amountInCents = amount * 100;
  try{
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Update Invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices')
}

export async function deleteInvoice(id: string) {
  //throw new Error('Failed to Delete Invoice');
  try{
    await sql`
    DELETE from invoices
    WHERE id = ${id};
    `;
    return { message: 'Deleted Invoice.' };
  } catch (error) {
    return { 
      message: 'Database Error: Failed to Delete Invoice.'
    };
  }

  revalidatePath('/dashboard/invoices');
  //TODO: add confirmation for delete...
}

export async function authenticate (
  prevState: string |undefined,
  formData: FormData) {
  try{
    await signIn('credentials', formData);
  }
  catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

/*
If there's a 'CredentialsSignin' error, you want to show an appropriate error message. 
You can learn about NextAuth.js errors in the documentation
https://authjs.dev/reference/core/errors/
*/