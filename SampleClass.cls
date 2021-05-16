public class SameName {
    
    public SameName(ApexPages.StandardController std){
        
    }
    
    public static void doSomething(){
        
        Lead l = new Lead(FirstName='name');
        String realIndustry = l.Industry;
        Lead l2 = [SELECT Id,CreatedById,OwnerId FROM Lead WHERE
                  LeadSource != null LIMIT 1];
        
        SObjectField field = Account.Industry;
        Account acct = new Account(Name='Whatever');
        
        List<Account> accts = [SELECT Parent.AccountSource FROM Account WHERE CleanStatus != null
                              ORDER BY Site ];
        
        String contactFirstName = [SELECT Id FROM Contact LIMIT 1].FirstName;
        
        List<Account> moreAccts = [SELECT Id,(SELECT StageName FROM Opportunities WHERE 
                                             CloseDate != null ORDER BY IsPrivate ) FROM Account LIMIT 1];
        

    }

}