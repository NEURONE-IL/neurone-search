export default ServerConfigs = {
  reloadProfilesOnDeploy: true,
  reloadQuestionsOnDeploy: (Meteor.isProduction ? true : false),
  reloadDocCollectionOnDeploy: true
}