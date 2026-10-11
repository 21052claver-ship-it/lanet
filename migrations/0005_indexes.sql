CREATE INDEX likes_resource ON likes(type,target_id,active);
CREATE INDEX votes_proposal ON votes(proposal_id);
CREATE INDEX consultations_note ON consultations(note_id);
CREATE INDEX files_note ON files(note_id);
CREATE INDEX files_proposal ON files(proposal_id);
CREATE INDEX events_owner ON events(owner_id,visibility,date);
