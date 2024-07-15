const express = require('express');

const authMiddleware = require('../middleware/auth');
const teamController = require('../controllers/team');

const router = express.Router();

router.get('/:org_id',authMiddleware.auth, teamController.getTeamsByOrgId);
router.get('/count/:org_id',authMiddleware.auth, teamController.getTeamsCountByOrgId);
router.post('/',authMiddleware.auth, teamController.addTeam);
router.put('/status', authMiddleware.auth, teamController.teamStatus)
router.get('/admin/get-form-teams/:formId', authMiddleware.auth, teamController.getTeamsByFormId);
router.get('/admin/get-team-members/',authMiddleware.auth, teamController.getMemberTeams);
router.put('/admin/delete-team-members/',authMiddleware.auth, teamController.deleteMemberTeams);
router.get('/admin/get-team-managers/',authMiddleware.auth, teamController.getManagerTeams);
router.put('/admin/delete-team-managers/',authMiddleware.auth, teamController.deleteManagerTeams);

router.get('/mob/get-managers-list-mob/',authMiddleware.auth, teamController.getManagerListUserMob);
router.post('/mob/add-device-in-team-mob',authMiddleware.auth, teamController.addNewDeviceInTeamMob);
router.get('/count-teams-mob/:org_id/:team_id',authMiddleware.auth, teamController.getCountsbyOrgTeamIdMob);
router.get('/mob/get-team-members-mob/',authMiddleware.auth, teamController.getMemberTeamsMob);
router.get('/mob/get-team-manager-mob/',authMiddleware.auth, teamController.getManagerTeamsMob);
router.get('/mob/get-team-form-mob/',authMiddleware.auth, teamController.getFormTeamsMob);
router.put('/mob/delete-team-members-mob/',authMiddleware.auth, teamController.deleteMemberTeamsMob);
router.get('/mob/get-device-details-mob/:userId',authMiddleware.auth, teamController.getUserDeviceDetailMob);
router.get('/mob/team-invitations-mob/:orgId/:teamId',authMiddleware.auth, teamController.getInvitationsMob);
router.put('/mob/delete-team-invitations-mob/:orgId',authMiddleware.auth, teamController.deleteInvitationsMob);
module.exports = router;