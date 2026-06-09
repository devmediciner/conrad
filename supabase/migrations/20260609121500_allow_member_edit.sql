-- Policy to allow users to view their own submitted cases (even if pending)
CREATE POLICY "Users can view own cases" ON public.cases
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

-- Policy to allow users to update their own submitted cases
CREATE POLICY "Users can update their own cases" ON public.cases
  FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid());

-- Policy to allow users to delete their own submitted cases if they are still pending
CREATE POLICY "Users can delete their own pending cases" ON public.cases
  FOR DELETE
  TO authenticated
  USING (submitted_by = auth.uid() AND status = 'pending');
