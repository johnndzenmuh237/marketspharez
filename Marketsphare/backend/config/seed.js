'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');
const Job      = require('../models/Job');
const Service  = require('../models/Service');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marketsphare');
  console.log('Connected to MongoDB for seeding...');

  await User.deleteMany({}); await Job.deleteMany({}); await Service.deleteMany({});
  console.log('Cleared existing data.');

  // Create admin
  const admin = await User.create({ fullName: 'Sara Lin', email: 'admin@marketsphare.com', password: 'Admin@1234', role: 'admin', isEmailVerified: true });

  // Create employers
  const employers = await User.insertMany([
    { fullName: 'BrightWave Team', email: 'hr@brightwave.com',    password: 'Employer@1234', role: 'employer', isEmailVerified: true, company: { name: 'BrightWave', description: 'Growth-focused SaaS company.', size: '51-200' } },
    { fullName: 'Cobalt Co. HR',   email: 'jobs@cobaltco.com',    password: 'Employer@1234', role: 'employer', isEmailVerified: true, company: { name: 'Cobalt Co.', description: 'Performance marketing agency.', size: '11-50' } },
    { fullName: 'Vertex Labs',     email: 'talent@vertexlabs.io', password: 'Employer@1234', role: 'employer', isEmailVerified: true, company: { name: 'Vertex Labs', description: 'B2B tech startup.', size: '11-50' } },
  ]);

  // Create workers
  const workers = await User.insertMany([
    { fullName: 'Jamie Morales', email: 'jamie@marketsphare.com', password: 'Worker@1234', role: 'worker', isEmailVerified: true, jobTitle: 'SEO Strategist', skills: ['SEO', 'Content Strategy', 'Google Analytics', 'Technical Audits'], hourlyRate: 65, location: 'Austin, TX', bio: '5+ years growing organic traffic for SaaS brands.' },
    { fullName: 'Theo Chen',     email: 'theo@marketsphare.com',  password: 'Worker@1234', role: 'worker', isEmailVerified: true, jobTitle: 'Email Marketing Specialist', skills: ['Klaviyo', 'Mailchimp', 'Email Automation', 'Copywriting'], hourlyRate: 55, location: 'Remote' },
    { fullName: 'Riya Kapoor',   email: 'riya@marketsphare.com',  password: 'Worker@1234', role: 'worker', isEmailVerified: true, jobTitle: 'Paid Social Manager', skills: ['Meta Ads', 'TikTok Ads', 'Google Ads', 'Reporting'], hourlyRate: 70, location: 'London, UK' },
  ]);

  // Create jobs
  await Job.insertMany([
    { title: 'SEO Strategist', description: 'Lead SEO strategy for our SaaS product. Drive organic growth across blog, landing pages, and technical infrastructure.', employer: employers[0]._id, category: 'seo', jobType: 'full-time', location: 'Remote — Anywhere', salary: { type: 'Weekly', min: 3000, max: 3400, display: '$3,200/W' }, skills: ['SEO', 'Content', 'Analytics'], status: 'published' },
    { title: 'Paid Social Specialist', description: 'Manage Meta and TikTok ad campaigns for our DTC clients. Own full-funnel from creative to reporting.', employer: employers[1]._id, category: 'ppc', jobType: 'contract', location: 'Remote — US Only', salary: { type: 'hourly', min: 40, max: 50, display: '$45/hr' }, skills: ['Meta Ads', 'TikTok', 'Strategy'], status: 'published' },
    { title: 'Email Marketing Manager', description: 'Own our email channel. Build automations, write copy, analyse performance. Klaviyo experience required.', employer: employers[2]._id, category: 'email', jobType: 'part-time', location: 'Remote — Anywhere', salary: { type: 'monthly', min: 1900, max: 2300, display: '$2,100/W' }, skills: ['Klaviyo', 'Automation', 'Copywriting'], status: 'published' },
    { title: 'Content Marketing Lead', description: 'Scale content production for our EU market. Manage writers, own editorial calendar, report on organic KPIs.', employer: employers[0]._id, category: 'content', jobType: 'full-time', location: 'Remote — EU Only', salary: { type: 'monthly', min: 3600, max: 4000, display: '$3,800/W' }, skills: ['Content Strategy', 'SEO', 'Team Management'], status: 'published' },
  ]);

  // Create services
  await Service.insertMany([
    { provider: workers[0]._id, title: 'Complete SEO Audit & Strategy', description: 'Full technical, on-page, and content audit with a 90-day actionable roadmap.', category: 'seo', packages: [{ name: 'Basic', description: 'Audit only', price: 349, deliveryDays: 7, revisions: 2 }, { name: 'Full Strategy', description: 'Audit + 90-day roadmap', price: 799, deliveryDays: 14, revisions: 3 }], tags: ['SEO', 'audit', 'technical'], rating: 4.9, reviewCount: 212 },
    { provider: workers[1]._id, title: 'Email Funnel & Automation Build', description: 'Klaviyo/Mailchimp flows: welcome, abandoned cart, post-purchase, winback.', category: 'email', packages: [{ name: 'Starter', description: '3 core flows', price: 399, deliveryDays: 10, revisions: 2 }, { name: 'Complete', description: '7 flows + strategy', price: 899, deliveryDays: 21, revisions: 5 }], tags: ['email', 'automation', 'klaviyo'], rating: 4.9, reviewCount: 151 },
    { provider: workers[2]._id, title: 'Meta & Google Ads Management', description: 'Full-funnel campaign setup, optimisation and reporting for your brand.', category: 'ppc', packages: [{ name: 'Launch', description: 'Campaign setup only', price: 499, deliveryDays: 5, revisions: 2 }, { name: 'Monthly', description: 'Ongoing management', price: 1200, deliveryDays: 30, revisions: 0 }], tags: ['meta ads', 'google ads', 'PPC'], rating: 4.8, reviewCount: 88 },
  ]);

  console.log('✅ Seed complete!');
  console.log('─────────────────────────────────────────');
  console.log('Admin:    admin@marketsphare.com / Admin@1234');
  console.log('Worker:   jamie@marketsphare.com / Worker@1234');
  console.log('Employer: hr@brightwave.com / Employer@1234');
  console.log('─────────────────────────────────────────');
  process.exit(0);
};

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
