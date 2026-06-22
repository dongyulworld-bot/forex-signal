-- SQL script to setup database in Supabase SQL Editor
-- This corresponds to the Prisma schema for Dexia Markets AI Signal

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enum type for Agent Roles (matching Prisma enum)
CREATE TYPE "Role" AS ENUM (
  'GLOBAL_SALES_HEAD',
  'REGIONAL_MANAGER',
  'BRANCH_MANAGER',
  'TEAM_LEADER',
  'LOCAL_AGENT'
);

-- Create Agent Table
CREATE TABLE IF NOT EXISTS "Agent" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "parentId" UUID REFERENCES "Agent"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create User Table
CREATE TABLE IF NOT EXISTS "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "agentId" UUID REFERENCES "Agent"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create ChartAnalysis Table
CREATE TABLE IF NOT EXISTS "ChartAnalysis" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "imageUrl" TEXT NOT NULL,
  "trend" TEXT NOT NULL,
  "planAScenario" TEXT NOT NULL,
  "planAProbability" INTEGER NOT NULL,
  "planBScenario" TEXT NOT NULL,
  "planBProbability" INTEGER NOT NULL,
  "rawResponse" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Mt5Sync Table
CREATE TABLE IF NOT EXISTS "Mt5Sync" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "mt5Login" TEXT UNIQUE NOT NULL,
  "tradingVolume" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
  "status" TEXT DEFAULT 'PENDING' NOT NULL,
  "syncedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_agent_role" ON "Agent"("role");
CREATE INDEX IF NOT EXISTS "idx_agent_parent" ON "Agent"("parentId");
CREATE INDEX IF NOT EXISTS "idx_user_agent" ON "User"("agentId");
CREATE INDEX IF NOT EXISTS "idx_chart_analysis_user" ON "ChartAnalysis"("userId");
CREATE INDEX IF NOT EXISTS "idx_mt5_sync_user" ON "Mt5Sync"("userId");

-- Disable RLS or enable default RLS policies for simple local development
-- In production, configure appropriate policies. For our prototype we enable simple read/write.
ALTER TABLE "Agent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChartAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Mt5Sync" ENABLE ROW LEVEL SECURITY;

-- Simple public access policies for testing
CREATE POLICY "Allow public read on Agent" ON "Agent" FOR SELECT USING (true);
CREATE POLICY "Allow public insert on Agent" ON "Agent" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on Agent" ON "Agent" FOR UPDATE USING (true);

CREATE POLICY "Allow public read on User" ON "User" FOR SELECT USING (true);
CREATE POLICY "Allow public insert on User" ON "User" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on User" ON "User" FOR UPDATE USING (true);

CREATE POLICY "Allow public read on ChartAnalysis" ON "ChartAnalysis" FOR SELECT USING (true);
CREATE POLICY "Allow public insert on ChartAnalysis" ON "ChartAnalysis" FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on Mt5Sync" ON "Mt5Sync" FOR SELECT USING (true);
CREATE POLICY "Allow public insert on Mt5Sync" ON "Mt5Sync" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on Mt5Sync" ON "Mt5Sync" FOR UPDATE USING (true);

-- Added for Auth and AnalysisHistory updates
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;

CREATE TABLE IF NOT EXISTS "AnalysisHistory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "imageUrl" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "trend" TEXT NOT NULL,
  "planAScenario" TEXT NOT NULL,
  "planAProbability" INTEGER NOT NULL,
  "planAEntryPrice" TEXT NOT NULL,
  "planBScenario" TEXT NOT NULL,
  "planBProbability" INTEGER NOT NULL,
  "planBEntryPrice" TEXT NOT NULL,
  "status" TEXT DEFAULT 'COMPLETED' NOT NULL,
  "resultJson" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_analysis_history_user" ON "AnalysisHistory"("userId");
ALTER TABLE "AnalysisHistory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on AnalysisHistory" ON "AnalysisHistory" FOR SELECT USING (true);
CREATE POLICY "Allow public insert on AnalysisHistory" ON "AnalysisHistory" FOR INSERT WITH CHECK (true);

