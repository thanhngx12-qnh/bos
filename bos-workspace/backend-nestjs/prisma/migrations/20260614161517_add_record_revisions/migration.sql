-- CreateTable
CREATE TABLE "record_revisions" (
    "id" SERIAL NOT NULL,
    "record_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "patch_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "record_revisions_record_id_idx" ON "record_revisions"("record_id");

-- AddForeignKey
ALTER TABLE "record_revisions" ADD CONSTRAINT "record_revisions_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_revisions" ADD CONSTRAINT "record_revisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
