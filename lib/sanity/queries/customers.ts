import { defineQuery } from "next-sanity";

export const CUSTOMER_BY_EMAIL_QUERY = defineQuery(`*[
  _type == "customer"
  && email == $email
][0]{
  _id,
  email,
  name,
  phone,
  company,
  clerkUserId,
  stripeCustomerId,
  streetAddress,
  city,
  state,
  zip,
  country,
  createdAt
}`);

export const CUSTOMER_BY_CLERK_ID_QUERY = defineQuery(`*[
  _type == "customer"
  && clerkUserId == $clerkUserId
][0]{
  _id,
  email,
  name,
  phone,
  company,
  clerkUserId,
  streetAddress,
  city,
  state,
  zip,
  country,
  createdAt
}`);

export const CUSTOMER_BY_STRIPE_ID_QUERY = defineQuery(`*[
  _type == "customer"
  && stripeCustomerId == $stripeCustomerId
][0]{
  _id,
  email,
  name,
  clerkUserId,
  stripeCustomerId,
  createdAt
}`);
